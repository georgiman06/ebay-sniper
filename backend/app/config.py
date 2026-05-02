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
    anthropic_api_key: str = ""
    global_default_margin: float = 0.30
    token_cache_buffer_seconds: int = 60

    @field_validator(
        "ebay_auth_url",
        "ebay_browse_api_url",
        "ebay_finding_api_url",
        "database_url",
        "cors_origins",
        "api_key",
        "ebay_client_id",
        "ebay_client_secret",
        "scraperapi_key",
        "anthropic_api_key",
        mode="before",
    )
    @classmethod
    def strip_control_chars(cls, v):
        # Railway env vars sometimes ship with trailing whitespace / hidden
        # control chars that crash httpx ("Invalid non-printable ASCII").
        # Strip everything non-printable from secrets and URLs at load time.
        if not isinstance(v, str):
            return v
        return "".join(c for c in v if c.isprintable()).strip()

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