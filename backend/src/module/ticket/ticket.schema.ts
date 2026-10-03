import { z } from "zod";
import { TicketStatus } from "./ticket.status";
import type { CreateTicketInput, ListTicketsInput, UpdateTicketInput } from "./ticket.types";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const text = (max: number) => z.string().trim().min(1).max(max);
export const ticketStatusSchema = z.enum(TicketStatus);
export const ticketIdSchema = z.string().uuid();

export const createTicketSchema = z.object({
  customerName: text(200),
  customerEmail: text(254).email(),
  subject: text(200),
  description: text(10000),
  assignedTo: text(128).optional(),
}).strict();

export const updateTicketSchema = createTicketSchema.partial().extend({
  status: ticketStatusSchema.optional(),
  resolution: text(10000).optional(),
  assignedTo: text(128).nullable().optional(),
}).strict().refine((input) => Object.keys(input).length > 0, {
  message: "At least one ticket field is required",
}).refine((input) => input.status !== TicketStatus.RESOLVED || Boolean(input.resolution), {
  path: ["resolution"],
  message: "resolution is required when status is resolved",
});

export const listTicketsSchema = z.object({
  status: ticketStatusSchema.optional(),
  assignedTo: text(128).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  nextToken: text(4096).optional(),
}).strict();

export function parseInput<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ValidationError(result.error.issues.map((issue) =>
      `${issue.path.join(".") || "input"}: ${issue.message}`).join("; "));
  }
  return result.data;
}

export function parseCreateTicketInput(raw: unknown): CreateTicketInput {
  return parseInput(createTicketSchema, raw) as CreateTicketInput;
}

export function parseUpdateTicketInput(raw: unknown): UpdateTicketInput {
  return parseInput(updateTicketSchema, raw) as UpdateTicketInput;
}

export function parseListTicketsInput(raw: unknown): ListTicketsInput {
  return parseInput(listTicketsSchema, raw) as ListTicketsInput;
}



