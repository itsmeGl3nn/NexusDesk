import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { verifyJwt, type JwtPayload } from "./verifyJwt";
import { hasRole, type Role } from "./roles";

export interface AuthenticatedEvent extends APIGatewayProxyEventV2 {
  auth: {
    sub: string;
    email: string;
    groups: string[];
    role: Role;
    tenantId: string;
    raw: JwtPayload;
  };
}

type AuthenticatedHandler = (
  event: AuthenticatedEvent
) => Promise<APIGatewayProxyResultV2>;

function jsonResponse(statusCode: number, body: Record<string, unknown>): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

/**
 * Wraps a Lambda handler with JWT verification and optional role check.
 *
 * Usage:
 *   export const handler = authorize(async (event) => { ... });
 *   export const handler = authorize(async (event) => { ... }, "admin");
 */
export function authorize(handler: AuthenticatedHandler, requiredRole?: Role) {
  return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const authHeader = event.headers?.authorization ?? event.headers?.Authorization;
    if (!authHeader) {
      return jsonResponse(401, { message: "Missing Authorization header" });
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    let payload: JwtPayload;
    try {
      payload = await verifyJwt(token);
    } catch {
      return jsonResponse(401, { message: "Invalid or expired token" });
    }

    const groups: string[] = (payload["cognito:groups"] as string[] | undefined) ?? [];
    const role = resolveRole(groups);
    const tenantId = (payload as Record<string, unknown>)["custom:tenantId"] as string ?? "";

    if (requiredRole && !hasRole(role, requiredRole)) {
      return jsonResponse(403, { message: "Insufficient permissions" });
    }

    const authenticatedEvent: AuthenticatedEvent = {
      ...event,
      auth: {
        sub: payload.sub,
        email: (payload as Record<string, unknown>)["email"] as string ?? "",
        groups,
        role,
        tenantId,
        raw: payload,
      },
    };

    return handler(authenticatedEvent);
  };
}

function resolveRole(groups: string[]): Role {
  if (groups.includes("admin")) return "admin";
  if (groups.includes("supervisor")) return "supervisor";
  return "agent";
}
