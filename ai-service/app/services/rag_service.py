from typing import Any

from app.models.schemas import CustomerContext, HistoryItem, ResolvedTicket, TicketContext
from app.services.chroma_service import ChromaService


class RagService:
	def __init__(self, collection: Any | None = None) -> None:
		self._collection = collection or ChromaService().resolved_tickets

	def index_resolved_ticket(self, ticket: ResolvedTicket) -> None:
		self._collection.upsert(
			ids=[self._document_id(ticket.tenant_id, ticket.ticket_id)],
			documents=[self._document(ticket)],
			metadatas=[
				{
					"tenant_id": ticket.tenant_id,
					"ticket_id": ticket.ticket_id,
					"customer_email": ticket.customer_email,
					"subject": ticket.subject,
					"resolution": ticket.resolution,
					"resolved_at": ticket.resolved_at,
				}
			],
		)

	def get_customer_context(
		self,
		ticket: TicketContext,
		customer_history_limit: int = 5,
		similar_resolution_limit: int = 3,
	) -> CustomerContext:
		query = f"{ticket.subject}\n{ticket.description}"
		customer_results = self._query(
			query,
			customer_history_limit,
			{
				"$and": [
					{"tenant_id": ticket.tenant_id},
					{"customer_email": ticket.customer_email},
					{"ticket_id": {"$ne": ticket.ticket_id}},
				]
			},
		)
		customer_history = self._items(customer_results)

		similar_resolutions: list[HistoryItem] = []
		if similar_resolution_limit:
			generic_results = self._query(
				query,
				similar_resolution_limit + len(customer_history),
				{
					"$and": [
						{"tenant_id": ticket.tenant_id},
						{"customer_email": {"$ne": ticket.customer_email}},
					]
				},
			)
			similar_resolutions = self._items(generic_results)[:similar_resolution_limit]

		return CustomerContext(
			customer_history=customer_history,
			similar_resolutions=similar_resolutions,
		)

	def _query(self, text: str, limit: int, where: dict[str, Any]) -> dict[str, Any]:
		return self._collection.query(
			query_texts=[text],
			n_results=limit,
			where=where,
			include=["metadatas", "distances"],
		)

	@staticmethod
	def _items(results: dict[str, Any]) -> list[HistoryItem]:
		metadatas = (results.get("metadatas") or [[]])[0]
		distances = (results.get("distances") or [[]])[0]
		return [
			HistoryItem(
				ticket_id=metadata["ticket_id"],
				subject=metadata["subject"],
				resolution=metadata["resolution"],
				resolved_at=metadata["resolved_at"],
				distance=distances[index] if index < len(distances) else None,
			)
			for index, metadata in enumerate(metadatas)
		]

	@staticmethod
	def _document_id(tenant_id: str, ticket_id: str) -> str:
		return f"{tenant_id}:{ticket_id}"

	@staticmethod
	def _document(ticket: ResolvedTicket) -> str:
		return (
			f"Subject: {ticket.subject}\n"
			f"Issue: {ticket.description}\n"
			f"Resolution: {ticket.resolution}"
		)
