import TicketTable from '../components/tickets/TicketTable';
import TicketDetailPanel from '../components/tickets/TicketDetailPanel';
import CallCenterWidget from '../components/call/CallCenterWidget';

export default function TicketsPage() {
  return (
    <div className="flex min-h-full flex-col xl:h-full xl:flex-row">
      {/* Main ticket table */}
      <div className="min-w-0 min-h-[24rem] flex-1 border-b border-gray-200 xl:border-b-0 xl:border-r xl:overflow-hidden">
        <TicketTable />
      </div>

      {/* Right panel */}
      <div className="w-full shrink-0 flex flex-col xl:w-80 xl:overflow-hidden">
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
