import {
  CognitoIdentityProviderClient, InitiateAuthCommand, GetUserCommand, GlobalSignOutCommand,
  ConfirmSignUpCommand, AdminAddUserToGroupCommand, AdminCreateUserCommand,
  AdminSetUserPasswordCommand, AdminDeleteUserCommand, type AuthenticationResultType,
} from "@aws-sdk/client-cognito-identity-provider";
import { config } from "../../utils/config";
import { logger } from "../../utils/logger";
import type { Role } from "./roles";

const client = new CognitoIdentityProviderClient({
  region: config.region,
  ...(config.awsEndpoint ? {
    endpoint: config.awsEndpoint, credentials: { accessKeyId: "test", secretAccessKey: "test" },
  } : {}),
});

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

export async function getUserAttributes(accessToken: string): Promise<Record<string, string>> {
  const result = await client.send(new GetUserCommand({ AccessToken: accessToken }));
  return Object.fromEntries((result.UserAttributes ?? []).filter(({ Name }) => Name).map(({ Name, Value }) => [Name!, Value ?? ""]));
}

function toAuthTokens(result: AuthenticationResultType, refreshToken = result.RefreshToken): AuthTokens {
  if (!result.AccessToken || !result.IdToken || !refreshToken || !result.ExpiresIn) throw new Error("Incomplete Cognito authentication result");
  return { accessToken: result.AccessToken, idToken: result.IdToken, refreshToken, expiresIn: result.ExpiresIn };
}

export async function signIn(email: string, password: string): Promise<AuthTokens> {
  const result = await client.send(new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH", ClientId: config.cognitoClientId,
    AuthParameters: { USERNAME: email, PASSWORD: password },
  }));
  if (!result.AuthenticationResult) throw new Error("Authentication challenge required");
  return toAuthTokens(result.AuthenticationResult);
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const result = await client.send(new InitiateAuthCommand({
    AuthFlow: "REFRESH_TOKEN_AUTH", ClientId: config.cognitoClientId,
    AuthParameters: { REFRESH_TOKEN: refreshToken },
  }));
  if (!result.AuthenticationResult) throw new Error("Failed to refresh tokens");
  return toAuthTokens(result.AuthenticationResult, refreshToken);
}

export async function signOut(accessToken: string): Promise<void> {
  await client.send(new GlobalSignOutCommand({ AccessToken: accessToken }));
}

export async function confirmSignUp(email: string, code: string): Promise<void> {
  await client.send(new ConfirmSignUpCommand({
    ClientId: config.cognitoClientId, Username: email, ConfirmationCode: code,
  }));
}

export async function adminDeleteUser(email: string): Promise<void> {
  await client.send(new AdminDeleteUserCommand({ UserPoolId: config.cognitoUserPoolId, Username: email }));
}

/** Admin APIs own tenant assignment; self-service signup cannot join an existing tenant. */
export async function adminCreateUser(email: string, password: string, tenantId: string, group: Role): Promise<string> {
  const result = await client.send(new AdminCreateUserCommand({
    UserPoolId: config.cognitoUserPoolId, Username: email, TemporaryPassword: password,
    UserAttributes: [
      { Name: "email", Value: email }, { Name: "email_verified", Value: "true" },
      { Name: "custom:tenantId", Value: tenantId },
    ],
    MessageAction: "SUPPRESS",
  }));
  try {
    const sub = result.User?.Attributes?.find((attribute) => attribute.Name === "sub")?.Value;
    if (!sub) throw new Error("Cognito user sub missing");
    await client.send(new AdminSetUserPasswordCommand({
      UserPoolId: config.cognitoUserPoolId, Username: email, Password: password, Permanent: true,
    }));
    await client.send(new AdminAddUserToGroupCommand({
      UserPoolId: config.cognitoUserPoolId, Username: email, GroupName: group,
    }));
    return sub;
  } catch (error) {
    await rollbackUser(email);
    throw error;
  }
}

export async function rollbackUser(email: string): Promise<void> {
  try { await adminDeleteUser(email); }
  catch (error) { logger.error("Cognito user rollback failed", { error: error instanceof Error ? error.name : "UnknownError" }); }
}

