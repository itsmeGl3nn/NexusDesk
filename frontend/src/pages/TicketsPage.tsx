import TicketTable from '../components/tickets/TicketTable';
import TicketDetailPanel from '../components/tickets/TicketDetailPanel';
import CallCenterWidget from '../components/call/CallCenterWidget';

export default function TicketsPage() {
  return (
    <div className="flex h-full">
      {/* Main ticket table */}
      <div className="flex-1 border-r border-gray-200 overflow-hidden">
        <TicketTable />
      </div>

      {/* Right panel */}
      <div className="w-80 flex flex-col overflow-hidden">
        {/* Ticket detail */}
        <div className="flex-1 border-b border-gray-200 overflow-auto">
          <TicketDetailPanel />
        </div>

        {/* Call widget */}
        <div className="p-4">
          <CallCenterWidget />
        </div>
      </div>
    </div>
  );
}
