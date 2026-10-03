export interface Log {
  PK: string;
  SK: string;
  logId: string;
  tenantId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  ticketId?: string;
  createdAt: string;
  details?: Record<string, unknown>;
}

export interface Note {
  PK: string;
  SK: string;
  noteId: string;
  tenantId: string;
  ticketId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}
