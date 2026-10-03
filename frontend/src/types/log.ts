export interface Note {
  noteId: string;
  ticketId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Log {
  logId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}