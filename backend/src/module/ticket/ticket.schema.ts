import { TicketStatus } from "./ticket.status";
import type { CreateTicketInput, UpdateTicketInput } from "./ticket.types";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const VALID_STATUSES: string[] = Object.values(TicketStatus);

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

export function parseCreateTicketInput(raw: unknown): CreateTicketInput {
  if (!raw || typeof raw !== "object") {
    throw new ValidationError("Request body must be a JSON object");
  }
  const r = raw as Record<string, unknown>;
  return {
    customerName: requireString(r.customerName, "customerName"),
    customerEmail: requireString(r.customerEmail, "customerEmail"),
    subject: requireString(r.subject, "subject"),
    description: requireString(r.description, "description"),
  };
}

export function parseUpdateTicketInput(raw: unknown): UpdateTicketInput {
  if (!raw || typeof raw !== "object") {
    throw new ValidationError("Request body must be a JSON object");
  }
  const r = raw as Record<string, unknown>;
  const input: UpdateTicketInput = {};

  const customerName = optionalString(r.customerName, "customerName");
  if (customerName !== undefined) input.customerName = customerName;

  const customerEmail = optionalString(r.customerEmail, "customerEmail");
  if (customerEmail !== undefined) input.customerEmail = customerEmail;

  const subject = optionalString(r.subject, "subject");
  if (subject !== undefined) input.subject = subject;

  const description = optionalString(r.description, "description");
  if (description !== undefined) input.description = description;

  if (r.status !== undefined) {
    if (typeof r.status !== "string" || !VALID_STATUSES.includes(r.status)) {
      throw new ValidationError(`status must be one of: ${VALID_STATUSES.join(", ")}`);
    }
    input.status = r.status as TicketStatus;
  }

  return input;
}
