import type { Ticket } from "./ticket.types";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8000";

export async function indexResolvedTicket(ticket: Ticket): Promise<void> {
  if (!ticket.resolution) return;

  const response = await fetch(`${AI_SERVICE_URL}/ai/resolved-tickets`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      tenant_id: ticket.tenantId,
      ticket_id: ticket.ticketId,
      customer_email: ticket.customerEmail,
      subject: ticket.subject,
      description: ticket.description,
      resolution: ticket.resolution,
      resolved_at: ticket.updatedAt,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI indexing failed with status ${response.status}`);
  }
}