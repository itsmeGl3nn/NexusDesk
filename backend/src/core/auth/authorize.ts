import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { verifyJwt, type JwtPayload } from "./verifyJwt";
import { hasPermission, hasRole, type Permission, type Role } from "./roles";
import { getUserAttributes } from "./cognito";
import { getAuthenticatedProfile } from "../../module/user/user.repository";
import { errorResponse } from "../../utils/response";
import { logger } from "../../utils/logger";

export interface AuthenticatedEvent extends APIGatewayProxyEvent {
  auth: {
    sub: string;
    email: string;
    groups: string[];
    role: Role;
    tenantId: string;
    raw: JwtPayload;
  };
}

type AuthenticatedHandler = (event: AuthenticatedEvent) => Promise<APIGatewayProxyResult>;

/** Verify signature and revocation, then use the stored tenant/role authority. */
export function authorize(handler: AuthenticatedHandler, required?: Role | Permission) {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const header = event.headers?.authorization ?? event.headers?.Authorization;
    if (!header) return errorResponse(401, "Missing Authorization header");
    const token = header.replace(/^Bearer\s+/i, "");
    let payload: JwtPayload;
    try {
      payload = await verifyJwt(token);
    } catch {
      return errorResponse(401, "Invalid or expired token");
    }

    let profile;
    try {
      // GetUser rejects tokens revoked by GlobalSignOut; JWT verification alone cannot.
      const attributes = await getUserAttributes(token);
      if (attributes.sub !== payload.sub) return errorResponse(401, "Invalid or expired token");
      profile = await getAuthenticatedProfile(payload.sub, attributes.email ?? "", attributes["custom:tenantId"], attributes.email_verified === "true");
    } catch (error) {
      if (error instanceof Error && error.name === "NotAuthorizedException") {
        return errorResponse(401, "Invalid or expired token");
      }
      logger.error("Authentication lookup failed", { error: error instanceof Error ? error.name : "UnknownError" });
      return errorResponse(503, "Authentication service unavailable");
    }

    if (!profile) return errorResponse(403, "Account is not assigned to a tenant profile");
    if (profile.status !== "active") return errorResponse(403, "Account is inactive");
    if (required && !(required.includes(":")
      ? hasPermission(profile.role, required as Permission)
      : hasRole(profile.role, required as Role))) return errorResponse(403, "Insufficient permissions");

    try {
      return await handler({ ...event, auth: {
        sub: payload.sub, email: profile.email, groups: [profile.role], role: profile.role,
        tenantId: profile.tenantId, raw: payload,
      } });
    } catch (error) {
      logger.error("Protected request failed", { error: error instanceof Error ? error.name : "UnknownError" });
      return errorResponse(500, "Request failed");
    }
  };
}
