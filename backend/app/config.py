from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://gata:gata@localhost:5432/gata"
    smtp_host: str = "localhost"
    smtp_port: int = 1025

    app_public_url: str = "http://localhost:5173"
    jwt_issuer: str = "http://localhost:5173"
    jwt_signing_keys_json: str | None = None
    jwt_signing_keys_file: str | None = None


settings = Settings()