from fastapi import APIRouter

from app.models.schemas import CustomerContext, SuggestionRequest
from app.services.rag_service import RagService

router = APIRouter()


@router.post("/suggest/context", response_model=CustomerContext)
def get_suggestion_context(request: SuggestionRequest) -> CustomerContext:
	return RagService().get_customer_context(
		request.ticket,
		request.customer_history_limit,
		request.similar_resolution_limit,
	)
