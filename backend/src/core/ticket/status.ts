export const TicketStatus = {
    OPEN: "open",
    IN_PROGRESS: "in_progress",
    RESOLVED: "resolved",
    CLOSED: "closed",
    REOPENED: "reopened",
} as const;

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

/**
 * Allowed status transitions (Jira-style).
 *   open        -> in_progress
 *   in_progress -> resolved | reopened  (reopen if not resolvable)
 *   resolved    -> closed   | reopened  (reopen if customer rejects fix)
 *   reopened    -> in_progress
 *   closed      -> (terminal)
 */
const ALLOWED_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
    open: ["in_progress"],
    in_progress: ["resolved", "reopened"],
    resolved: ["closed", "reopened"],
    reopened: ["in_progress"],
    closed: [],
};

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: TicketStatus, to: TicketStatus): void {
    if (from === to) return;
    if (!canTransition(from, to)) {
        throw new Error(`Invalid ticket status transition: ${from} -> ${to}`);
    }
}
