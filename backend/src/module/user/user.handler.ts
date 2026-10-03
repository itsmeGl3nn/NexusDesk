import { CognitoIdentityProviderServiceException } from "@aws-sdk/client-cognito-identity-provider";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { authorize } from "../../core/auth/authorize";
import * as cognito from "../../core/auth/cognito";
import * as userService from "./user.service";
import { createUserSchema, updateUserSchema } from "./user.schema";
import { successResponse, errorResponse } from "../../utils/response";

function parseBody<T>(event: APIGatewayProxyEvent, schema: z.ZodType<T>): { ok: true; data: T } | { ok: false; result: APIGatewayProxyResult } {
  if (!event.body) return { ok: false, result: errorResponse(400, "Request body is required") };
  let raw: unknown;
  try { raw = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body); }
  catch { return { ok: false, result: errorResponse(400, "Invalid JSON body") }; }
  const parsed = schema.safeParse(raw);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, result: errorResponse(400, parsed.error.issues[0]?.message ?? "Invalid request") };
}

/** Admin provisions Cognito login and tenant profile together. */
export const createUser = authorize(async (event) => {
  const parsed = parseBody(event, createUserSchema);
  if (!parsed.ok) return parsed.result;
  const { password, ...profile } = parsed.data;
  let sub: string;
  try { sub = await cognito.adminCreateUser(profile.email, password, event.auth.tenantId, profile.role); }
  catch (error) {
    if (error instanceof CognitoIdentityProviderServiceException) {
      return errorResponse(error.name === "UsernameExistsException" ? 409 : 400, error.name === "UsernameExistsException" ? "An account with this email already exists." : "User creation failed");
    }
    throw error;
  }
  try { return successResponse(await userService.createUser(event.auth.tenantId, profile, sub, event.auth.sub), 201); }
  catch (error) {
    await cognito.rollbackUser(profile.email);
    throw error;
  }
}, "user:manage");

export const listUsers = authorize(async (event) => {
  return successResponse(await userService.listUsers(event.auth.tenantId));
}, "user:read");

export const getUser = authorize(async (event) => {
  const userId = event.pathParameters?.userId;
  if (!userId) return errorResponse(400, "userId path parameter is required");
  const user = await userService.getUser(event.auth.tenantId, userId);
  return user ? successResponse(user) : errorResponse(404, "User not found");
}, "user:read");

export const updateUser = authorize(async (event) => {
  const userId = event.pathParameters?.userId;
  if (!userId) return errorResponse(400, "userId path parameter is required");
  const parsed = parseBody(event, updateUserSchema);
  if (!parsed.ok) return parsed.result;
  if (!(await userService.getUser(event.auth.tenantId, userId))) return errorResponse(404, "User not found");
  return successResponse(await userService.updateUser(event.auth.tenantId, userId, parsed.data, event.auth.sub));
}, "user:manage");

export const getMe = authorize(async (event) => {
  const user = await userService.getCurrentUser(event.auth.sub);
  return user ? successResponse(user) : errorResponse(404, "Profile not found");
});

