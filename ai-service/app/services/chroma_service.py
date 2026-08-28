from collections.abc import Callable
from typing import Any

import chromadb

from app.config import settings


class ChromaService:
	def __init__(
		self,
		client_factory: Callable[..., Any] = chromadb.HttpClient,
	) -> None:
		host, port = self._parse_host(settings.chroma_host)
		self._client = client_factory(host=host, port=port)
		self.resolved_tickets = self._client.get_or_create_collection(
			name="resolved_tickets",
			metadata={"hnsw:space": "cosine"},
		)

	@staticmethod
	def _parse_host(url: str) -> tuple[str, int]:
		without_scheme = url.removeprefix("http://").removeprefix("https://")
		host, _, port = without_scheme.partition(":")
		return host, int(port or 8000)
