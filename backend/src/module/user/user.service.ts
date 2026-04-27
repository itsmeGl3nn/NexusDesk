import { v4 as uuidv4 } from "uuid";
import * as repo from "./user.repository";
import type { User, CreateUserInput, UpdateUserInput } from "./user.types";

export async function createUser(tenantId: string, input: CreateUserInput): Promise<User> {
  const now = new Date().toISOString();
  const userId = uuidv4();

  const user: User = {
    PK: `TENANT#${tenantId}`,
    SK: `USER#${userId}`,
    userId,
    tenantId,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    role: input.role,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  await repo.putUser(user);
  return user;
}

export async function getUser(tenantId: string, userId: string): Promise<User | undefined> {
  return repo.getUser(tenantId, userId);
}

export async function listUsers(tenantId: string): Promise<User[]> {
  return repo.listUsers(tenantId);
}

export async function updateUser(
  tenantId: string,
  userId: string,
  input: UpdateUserInput
): Promise<User> {
  return repo.updateUser(tenantId, userId, input);
}
