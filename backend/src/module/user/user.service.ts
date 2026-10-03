import * as repo from "./user.repository";
import type { User, CreateUserInput, UpdateUserInput } from "./user.types";

export function userRecord(tenantId: string, input: CreateUserInput, cognitoSub: string): User {
  if (!cognitoSub) throw new Error("Cognito user sub is required");
  const now = new Date().toISOString();
  return {
    PK: `TENANT#${tenantId}`, SK: `USER#${cognitoSub}`, userId: cognitoSub, cognitoSub,
    tenantId, email: input.email, firstName: input.firstName, lastName: input.lastName,
    role: input.role, status: "active", createdAt: now, updatedAt: now,
  };
}

export async function createUser(tenantId: string, input: CreateUserInput, cognitoSub: string, actorId = cognitoSub): Promise<User> {
  const user = userRecord(tenantId, input, cognitoSub);
  await repo.putUser(user, actorId);
  return user;
}

export const getUser = repo.getUser;
export const listUsers = repo.listUsers;
export const getCurrentUser = repo.getBoundProfile;

export async function updateUser(tenantId: string, userId: string, input: UpdateUserInput, actorId: string): Promise<User> {
  return repo.updateUser(tenantId, userId, input, actorId);
}
