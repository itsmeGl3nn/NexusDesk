import { z } from "zod";

const profileFields = {
  email: z.string().trim().toLowerCase().email().max(254),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  role: z.enum(["admin", "supervisor", "agent"]),
};

export const createUserSchema = z.object({
  ...profileFields,
  password: z.string().min(8).max(256).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
}).strict();

export const updateUserSchema = z.object({
  firstName: profileFields.firstName.optional(),
  lastName: profileFields.lastName.optional(),
  role: profileFields.role.optional(),
  status: z.enum(["active", "inactive"]).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "At least one user field is required");
