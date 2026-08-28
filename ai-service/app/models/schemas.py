from pydantic import BaseModel, Field, field_validator


class TicketContext(BaseModel):
	tenant_id: str = Field(min_length=1)
	ticket_id: str = Field(min_length=1)
	customer_email: str = Field(min_length=3)
	subject: str = Field(min_length=1)
	description: str = Field(min_length=1)

	@field_validator("customer_email")
	@classmethod
	def normalize_customer_email(cls, value: str) -> str:
		return value.strip().lower()


class ResolvedTicket(TicketContext):
	resolution: str = Field(min_length=1)
	resolved_at: str


class HistoryItem(BaseModel):
	ticket_id: str
	subject: str
	resolution: str
	resolved_at: str
	distance: float | None = None


class CustomerContext(BaseModel):
	customer_history: list[HistoryItem] = Field(default_factory=list)
	similar_resolutions: list[HistoryItem] = Field(default_factory=list)


class SuggestionRequest(BaseModel):
	ticket: TicketContext
	customer_history_limit: int = Field(default=5, ge=1, le=20)
	similar_resolution_limit: int = Field(default=3, ge=0, le=10)
