import type { APIGatewayProxyResultV2 } from "aws-lambda";
import { authorize, type AuthenticatedEvent } from "../../core/auth/authorize";
import { getTenantId } from "../../core/tenant/getTenant";
import * as userService from "./user.service";
import type { CreateUserInput, UpdateUserInput } from "./user.types";
import { Role } from "../../core/auth/roles";

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

/** POST /users — Admin only */
export const createUser = authorize(async (event: AuthenticatedEvent) => {
  const tenantId = getTenantId(event);
  if (!event.body) return json(400, { message: "Request body is required" });

  let input: CreateUserInput;
  try {
    input = JSON.parse(event.body);
  } catch {
    return json(400, { message: "Invalid JSON body" });
  }

  if (!input.email || !input.displayName || !input.role) {
    return json(400, { message: "email, displayName, and role are required" });
  }

  const validRoles: string[] = [Role.ADMIN, Role.SUPERVISOR, Role.AGENT];
  if (!validRoles.includes(input.role)) {
    return json(400, { message: `role must be one of: ${validRoles.join(", ")}` });
  }

  const user = await userService.createUser(tenantId, input);
  return json(201, user);
}, "admin");

/** GET /users — Supervisors and above */
export const listUsers = authorize(async (event: AuthenticatedEvent) => {
  const tenantId = getTenantId(event);
  const users = await userService.listUsers(tenantId);
  return json(200, users);
}, "supervisor");

/** GET /users/{userId} — Any authenticated user */
export const getUser = authorize(async (event: AuthenticatedEvent) => {
  const tenantId = getTenantId(event);
  const userId = event.pathParameters?.userId;
  if (!userId) return json(400, { message: "userId path parameter is required" });

  const user = await userService.getUser(tenantId, userId);
  if (!user) return json(404, { message: "User not found" });

  return json(200, user);
});

/** PATCH /users/{userId} — Admin only */
export const updateUser = authorize(async (event: AuthenticatedEvent) => {
  const tenantId = getTenantId(event);
  const userId = event.pathParameters?.userId;
  if (!userId) return json(400, { message: "userId path parameter is required" });
  if (!event.body) return json(400, { message: "Request body is required" });

  let input: UpdateUserInput;
  try {
    input = JSON.parse(event.body);
  } catch {
    return json(400, { message: "Invalid JSON body" });
  }

  try {
    const updated = await userService.updateUser(tenantId, userId, input);
    return json(200, updated);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "ConditionalCheckFailedException") {
      return json(404, { message: "User not found" });
    }
    throw err;
  }
}, "admin");

/** GET /me — Returns the caller's own profile */
export const getMe = authorize(async (event: AuthenticatedEvent) => {
  const tenantId = getTenantId(event);
  const user = await userService.getUser(tenantId, event.auth.sub);
  if (!user) return json(404, { message: "Profile not found" });
  return json(200, user);
});
