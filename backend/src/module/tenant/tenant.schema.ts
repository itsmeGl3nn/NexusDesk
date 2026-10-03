import { z } from "zod";
import type { RegisterTenantInput } from "./tenant.types";

export class ValidationError extends Error {
  constructor(message: string) { super(message); this.name = "ValidationError"; }
}

const registerTenantSchema = z.object({
  tenantName: z.string().trim().min(1).max(200),
  adminEmail: z.string().trim().toLowerCase().email().max(254),
  adminPassword: z.string().min(8).max(256).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
  adminFirstName: z.string().trim().min(1).max(100),
  adminLastName: z.string().trim().min(1).max(100),
}).strict();

export function parseRegisterTenantInput(raw: unknown): RegisterTenantInput {
  const parsed = registerTenantSchema.safeParse(raw);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid registration");
  return parsed.data;
}

