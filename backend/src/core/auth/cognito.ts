import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  type AuthenticationResultType,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({
  ...(process.env.AWS_ENDPOINT && { endpoint: process.env.AWS_ENDPOINT }),
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

function toAuthTokens(result: AuthenticationResultType): AuthTokens {
  return {
    accessToken: result.AccessToken!,
    idToken: result.IdToken!,
    refreshToken: result.RefreshToken!,
    expiresIn: result.ExpiresIn!,
  };
}

/** Sign in with email + password (USER_PASSWORD_AUTH flow) */
export async function signIn(email: string, password: string): Promise<AuthTokens> {
  const result = await client.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    })
  );

  if (!result.AuthenticationResult) {
    throw new Error(result.ChallengeName ?? "Authentication challenge required");
  }

  return toAuthTokens(result.AuthenticationResult);
}

/** Refresh access token */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const result = await client.send(
    new InitiateAuthCommand({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    })
  );

  if (!result.AuthenticationResult) {
    throw new Error("Failed to refresh tokens");
  }

  return {
    accessToken: result.AuthenticationResult.AccessToken!,
    idToken: result.AuthenticationResult.IdToken!,
    refreshToken: refreshToken, // refresh token is not rotated
    expiresIn: result.AuthenticationResult.ExpiresIn!,
  };
}

/** Self-service sign-up */
export async function signUp(
  email: string,
  password: string,
  tenantId: string
): Promise<{ userSub: string; confirmed: boolean }> {
  const result = await client.send(
    new SignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "custom:tenantId", Value: tenantId },
      ],
    })
  );

  return {
    userSub: result.UserSub!,
    confirmed: result.UserConfirmed ?? false,
  };
}

/** Confirm sign-up with verification code */
export async function confirmSignUp(email: string, code: string): Promise<void> {
  await client.send(
    new ConfirmSignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
    })
  );
}

/** Admin: create a user and set permanent password */
export async function adminCreateUser(
  email: string,
  password: string,
  tenantId: string,
  group: string
): Promise<string> {
  const result = await client.send(
    new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      TemporaryPassword: password,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "true" },
        { Name: "custom:tenantId", Value: tenantId },
      ],
      MessageAction: "SUPPRESS",
    })
  );

  const userSub = result.User?.Attributes?.find((a) => a.Name === "sub")?.Value ?? "";

  // Set permanent password
  await client.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      Password: password,
      Permanent: true,
    })
  );

  // Add to group
  await client.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      GroupName: group,
    })
  );

  return userSub;
}
