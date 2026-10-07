import type { Role } from "../../core/auth/roles";
import type { z } from "zod";
import type { updateUserSchema } from "./user.schema";

export interface User {
  PK: string;           // TENANT#<tenantId>
  SK: string;           // USER#<userId>
  userId: string;
  cognitoSub: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
