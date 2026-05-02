from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    ebay_client_id: str = ""
    ebay_client_secret: str = ""
    ebay_marketplace_id: str = "EBAY_US"
    ebay_auth_url: str
    ebay_browse_api_url: str
    ebay_finding_api_url: str
    database_url: str
    api_key: str
    sentry_dsn: str = ""
    cors_origins: str = "http://localhost:3000"
    scraperapi_key: str = ""
    global_default_margin: float = 0.30
    token_cache_buffer_seconds: int = 60

    @field_validator("database_url")
    @classmethod
    def fix_db_scheme(cls, v: str) -> str:
        # Railway Postgres provides postgresql:// but asyncpg requires postgresql+asyncpg://
        if v.startswith("postgresql://") or v.startswith("postgres://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1).replace("postgres://", "postgresql+asyncpg://", 1)
        return v

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()