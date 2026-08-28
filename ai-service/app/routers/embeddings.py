from fastapi import APIRouter, status

from app.models.schemas import ResolvedTicket
from app.services.rag_service import RagService

router = APIRouter()


@router.post("/resolved-tickets", status_code=status.HTTP_204_NO_CONTENT)
def index_resolved_ticket(ticket: ResolvedTicket) -> None:
	RagService().index_resolved_ticket(ticket)
