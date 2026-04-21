import type { Role } from "../../core/auth/roles";

export interface User {
  PK: string;           // TENANT#<tenantId>
  SK: string;           // USER#<userId>
  userId: string;
  tenantId: string;
  email: string;
  displayName: string;
  role: Role;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  displayName: string;
  role: Role;
}

export interface UpdateUserInput {
  displayName?: string;
  role?: Role;
  status?: "active" | "inactive";
}
