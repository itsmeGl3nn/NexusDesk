import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CognitoIdentityProviderServiceException } from "@aws-sdk/client-cognito-identity-provider";
import * as cognito from "../../core/auth/cognito";
import type { LoginInput, SignupInput, ConfirmInput, RefreshInput } from "./auth.types";

function json(statusCode: number, body: unknown): APIGatewayProxyResult {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function getRawBody(event: APIGatewayProxyEvent): string | undefined {
  if (!event.body) return undefined;
  return event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf-8") : event.body;
}

function parseBody<T>(event: APIGatewayProxyEvent): { ok: true; data: T } | { ok: false; result: APIGatewayProxyResult } {
  const raw = getRawBody(event);
  if (!raw) return { ok: false, result: json(400, { message: "Request body is required" }) };
  try {
    return { ok: true, data: JSON.parse(raw) as T };
  } catch {
    return { ok: false, result: json(400, { message: "Invalid JSON body" }) };
  }
}

function toCognitoMessage(err: unknown, fallback: string): string {
  if (err instanceof CognitoIdentityProviderServiceException) {
    const safe: Record<string, string> = {
      NotAuthorizedException:    "Incorrect email or password.",
      UserNotFoundException:     "Incorrect email or password.",
      UserNotConfirmedException: "Account not confirmed. Check your email.",
      CodeMismatchException:     "Invalid confirmation code.",
      ExpiredCodeException:      "Confirmation code has expired.",
      UsernameExistsException:   "An account with this email already exists.",
    };
    return safe[err.name] ?? fallback;
  }
  return fallback;
}

export async function login(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const parsed = parseBody<LoginInput>(event);
  if (!parsed.ok) return parsed.result;

  const { email, password } = parsed.data;
  if (!email || !password) return json(400, { message: "email and password are required" });

  try {
    return json(200, await cognito.signIn(email, password));
  } catch (err) {
    return json(401, { message: toCognitoMessage(err, "Authentication failed") });
  }
}

export async function signup(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const parsed = parseBody<SignupInput>(event);
  if (!parsed.ok) return parsed.result;

  const { email, password, tenantId } = parsed.data;
  if (!email || !password || !tenantId) return json(400, { message: "email, password, and tenantId are required" });

  try {
    return json(201, await cognito.signUp(email, password, tenantId));
  } catch (err) {
    return json(400, { message: toCognitoMessage(err, "Sign-up failed") });
  }
}

export async function confirmSignup(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const parsed = parseBody<ConfirmInput>(event);
  if (!parsed.ok) return parsed.result;

  const { email, code } = parsed.data;
  if (!email || !code) return json(400, { message: "email and code are required" });

  try {
    await cognito.confirmSignUp(email, code);
    return json(200, { message: "Account confirmed" });
  } catch (err) {
    return json(400, { message: toCognitoMessage(err, "Confirmation failed") });
  }
}

export async function refresh(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const parsed = parseBody<RefreshInput>(event);
  if (!parsed.ok) return parsed.result;

  const { refreshToken } = parsed.data;
  if (!refreshToken) return json(400, { message: "refreshToken is required" });

  try {
    return json(200, await cognito.refreshTokens(refreshToken));
  } catch (err) {
    return json(401, { message: toCognitoMessage(err, "Token refresh failed") });
  }
}