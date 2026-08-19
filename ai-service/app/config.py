from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ollama_host: str = "http://localhost:11434"
    chroma_host: str = "http://localhost:8001"
    model_name: str = "llama3.1"

    class Config:
        env_file = ".env"

settings = Settings()