import type { TicketStatus } from '../../types/ticket';

const statusConfig: Record<TicketStatus, { label: string; className: string }> = {
  open: { label: 'OPEN', className: 'bg-orange-100 text-orange-700' },
  in_progress: { label: 'IN PROGRESS', className: 'bg-blue-100 text-blue-700' },
  resolved: { label: 'RESOLVED', className: 'bg-green-100 text-green-700' },
  closed: { label: 'CLOSED', className: 'bg-gray-100 text-gray-600' },
  reopened: { label: 'REOPENED', className: 'bg-yellow-100 text-yellow-700' },
};

interface StatusBadgeProps {
  status: TicketStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.className}`}>
      {config.label}
      <span className="text-[10px]">›</span>
    </span>
  );
}
