import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import * as cognito from "../../core/auth/cognito";

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

/** POST /auth/login */
export async function login(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  if (!event.body) return json(400, { message: "Request body is required" });

  let input: { email?: string; password?: string };
  try {
    input = JSON.parse(event.body);
  } catch {
    return json(400, { message: "Invalid JSON body" });
  }

  if (!input.email || !input.password) {
    return json(400, { message: "email and password are required" });
  }

  try {
    const tokens = await cognito.signIn(input.email, input.password);
    return json(200, tokens);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    return json(401, { message });
  }
}

/** POST /auth/signup */
export async function signup(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  if (!event.body) return json(400, { message: "Request body is required" });

  let input: { email?: string; password?: string; tenantId?: string };
  try {
    input = JSON.parse(event.body);
  } catch {
    return json(400, { message: "Invalid JSON body" });
  }

  if (!input.email || !input.password || !input.tenantId) {
    return json(400, { message: "email, password, and tenantId are required" });
  }

  try {
    const result = await cognito.signUp(input.email, input.password, input.tenantId);
    return json(201, result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sign-up failed";
    return json(400, { message });
  }
}

/** POST /auth/confirm */
export async function confirmSignup(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  if (!event.body) return json(400, { message: "Request body is required" });

  let input: { email?: string; code?: string };
  try {
    input = JSON.parse(event.body);
  } catch {
    return json(400, { message: "Invalid JSON body" });
  }

  if (!input.email || !input.code) {
    return json(400, { message: "email and code are required" });
  }

  try {
    await cognito.confirmSignUp(input.email, input.code);
    return json(200, { message: "Account confirmed" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Confirmation failed";
    return json(400, { message });
  }
}

/** POST /auth/refresh */
export async function refresh(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  if (!event.body) return json(400, { message: "Request body is required" });

  let input: { refreshToken?: string };
  try {
    input = JSON.parse(event.body);
  } catch {
    return json(400, { message: "Invalid JSON body" });
  }

  if (!input.refreshToken) {
    return json(400, { message: "refreshToken is required" });
  }

  try {
    const tokens = await cognito.refreshTokens(input.refreshToken);
    return json(200, tokens);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Token refresh failed";
    return json(401, { message });
  }
}
