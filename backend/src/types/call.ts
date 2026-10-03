export interface Call {
  PK: string;
  SK: string;
  callId: string;
  tenantId: string;
  ticketId: string;
  agentId: string;
  customerName: string;
  customerEmail: string;
  status: "active" | "ended";
  simulated: true;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
}
