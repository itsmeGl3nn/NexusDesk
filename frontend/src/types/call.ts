export interface Call {
  callId: string;
  ticketId: string;
  tenantId: string;
  agentId: string;
  customerName: string;
  customerEmail: string;
  status: 'active' | 'ended';
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  simulated: true;
}
