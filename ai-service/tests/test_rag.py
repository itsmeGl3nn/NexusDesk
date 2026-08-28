from app.models.schemas import ResolvedTicket, TicketContext
from app.services.rag_service import RagService


class FakeCollection:
	def __init__(self) -> None:
		self.upserts = []
		self.queries = []
		self.results = []

	def upsert(self, **kwargs) -> None:
		self.upserts.append(kwargs)

	def query(self, **kwargs):
		self.queries.append(kwargs)
		return self.results.pop(0)


def test_index_normalizes_email_and_stores_customer_metadata() -> None:
	collection = FakeCollection()
	service = RagService(collection)
	ticket = ResolvedTicket(
		tenant_id="tenant-1",
		ticket_id="ticket-1",
		customer_email="  John@Example.com ",
		subject="Printer offline",
		description="The printer stopped responding",
		resolution="Restarted the print spooler",
		resolved_at="2026-08-28T10:00:00Z",
	)

	service.index_resolved_ticket(ticket)

	upsert = collection.upserts[0]
	assert upsert["ids"] == ["tenant-1:ticket-1"]
	assert upsert["metadatas"][0]["customer_email"] == "john@example.com"
	assert "Restarted the print spooler" in upsert["documents"][0]


def test_context_separates_customer_history_from_tenant_fallback() -> None:
	collection = FakeCollection()
	collection.results = [
		{
			"metadatas": [[{
				"ticket_id": "old-ticket",
				"subject": "Printer offline before",
				"resolution": "Restarted the spooler",
				"resolved_at": "2026-08-01T10:00:00Z",
			}]],
			"distances": [[0.1]],
		},
		{
			"metadatas": [[{
				"ticket_id": "other-customer-ticket",
				"subject": "Similar printer",
				"resolution": "Reinstalled the driver",
				"resolved_at": "2026-08-02T10:00:00Z",
			}]],
			"distances": [[0.2]],
		},
	]
	service = RagService(collection)
	ticket = TicketContext(
		tenant_id="tenant-1",
		ticket_id="current-ticket",
		customer_email="JOHN@example.com",
		subject="Printer offline",
		description="It happened again",
	)

	context = service.get_customer_context(ticket)

	customer_filter = collection.queries[0]["where"]["$and"]
	fallback_filter = collection.queries[1]["where"]["$and"]
	assert {"tenant_id": "tenant-1"} in customer_filter
	assert {"customer_email": "john@example.com"} in customer_filter
	assert {"ticket_id": {"$ne": "current-ticket"}} in customer_filter
	assert {"tenant_id": "tenant-1"} in fallback_filter
	assert {"customer_email": {"$ne": "john@example.com"}} in fallback_filter
	assert context.customer_history[0].ticket_id == "old-ticket"
	assert context.similar_resolutions[0].ticket_id == "other-customer-ticket"
