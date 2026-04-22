from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ebay_client_id: str
    ebay_client_secret: str
    ebay_marketplace_id: str = "EBAY_US"
    ebay_auth_url: str
    ebay_browse_api_url: str
    ebay_finding_api_url: str
    database_url: str
    global_default_margin: float = 0.30
    token_cache_buffer_seconds: int = 60

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()