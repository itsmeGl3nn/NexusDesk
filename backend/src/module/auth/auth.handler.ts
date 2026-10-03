import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CognitoIdentityProviderServiceException } from "@aws-sdk/client-cognito-identity-provider";
import { z } from "zod";
import * as cognito from "../../core/auth/cognito";
import { authorize } from "../../core/auth/authorize";
import { successResponse, errorResponse } from "../../utils/response";
import { auditWrite } from "../log/log.service";
import { registerTenant } from "../tenant/tenant.handler";

function parseBody<T>(event: APIGatewayProxyEvent, schema: z.ZodType<T>): { ok: true; data: T } | { ok: false; result: APIGatewayProxyResult } {
  if (!event.body) return { ok: false, result: errorResponse(400, "Request body is required") };
  let raw: unknown;
  try { raw = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body); }
  catch { return { ok: false, result: errorResponse(400, "Invalid JSON body") }; }
  const parsed = schema.safeParse(raw);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, result: errorResponse(400, parsed.error.issues[0]?.message ?? "Invalid request") };
}

function toCognitoMessage(error: unknown, fallback: string): string {
  if (error instanceof CognitoIdentityProviderServiceException) {
    const messages: Record<string, string> = {
      NotAuthorizedException: "Incorrect email or password.",
      UserNotFoundException: "Incorrect email or password.",
      UserNotConfirmedException: "Account not confirmed. Check your email.",
      CodeMismatchException: "Invalid confirmation code.",
      ExpiredCodeException: "Confirmation code has expired.",
      UsernameExistsException: "An account with this email already exists.",
    };
    return messages[error.name] ?? fallback;
  }
  return fallback;
}

const email = z.string().trim().toLowerCase().email().max(254);

export async function login(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const parsed = parseBody(event, z.object({ email, password: z.string().min(1).max(256) }).strict());
  if (!parsed.ok) return parsed.result;
  try { return successResponse(await cognito.signIn(parsed.data.email, parsed.data.password)); }
  catch (error) { return errorResponse(401, toCognitoMessage(error, "Authentication failed")); }
}

// Both public aliases create a new tenant. Existing-tenant users require Admin POST /users.
export const signup = registerTenant;
export const register = registerTenant;

export async function confirmSignup(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const parsed = parseBody(event, z.object({ email, code: z.string().trim().min(1).max(64) }).strict());
  if (!parsed.ok) return parsed.result;
  try {
    await cognito.confirmSignUp(parsed.data.email, parsed.data.code);
    return successResponse({ message: "Account confirmed" });
  } catch (error) { return errorResponse(400, toCognitoMessage(error, "Confirmation failed")); }
}

export async function refresh(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const parsed = parseBody(event, z.object({ refreshToken: z.string().min(1).max(8192) }).strict());
  if (!parsed.ok) return parsed.result;
  try { return successResponse(await cognito.refreshTokens(parsed.data.refreshToken)); }
  catch { return errorResponse(401, "Token refresh failed"); }
}

export const logoutHandler = authorize(async (event) => {
  const header = event.headers.authorization ?? event.headers.Authorization!;
  await cognito.signOut(header.replace(/^Bearer\s+/i, ""));
  await auditWrite({ tenantId: event.auth.tenantId, actorId: event.auth.sub, action: "auth.logout", entityType: "user", entityId: event.auth.sub });
  return successResponse({ message: "Signed out" });
});

