from fastapi import FastAPI
from app.routers import chat, context, embeddings, escalation, sentiment, suggest, triage

app = FastAPI(title="AI Service")

app.include_router(triage.router, prefix="/ai", tags=["triage"])
app.include_router(sentiment.router, prefix="/ai", tags=["sentiment"])
app.include_router(suggest.router, prefix="/ai", tags=["suggest"])
app.include_router(escalation.router, prefix="/ai", tags=["escalation"])
app.include_router(chat.router, prefix="/ai", tags=["chat"])
app.include_router(embeddings.router, prefix="/ai", tags=["embeddings"])
app.include_router(context.router, prefix="/ai", tags=["context"])

@app.get("/health")
def health():
    return {"status": "ok"}