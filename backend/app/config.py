from pydantic import EmailStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://gata:gata@localhost:5432/gata"
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_from: EmailStr = "noreply@example.com"

    app_public_url: str = "http://localhost:5173"
    jwt_issuer: str = "http://localhost:5173"
    jwt_signing_keys_json: str | None = None
    jwt_signing_keys_file: str | None = None

    csrf_secret: str | None = None
    csrf_secret_file: str | None = None

    @field_validator("smtp_from", mode="before")
    @classmethod
    def reject_missing_smtp_from(cls, value: object) -> object:
        if value is None:
            msg = "SMTP_FROM is required"
            raise ValueError(msg)
        if isinstance(value, str) and value.strip().lower() == "none":
            msg = "SMTP_FROM must not be the literal 'None'"
            raise ValueError(msg)
        if isinstance(value, str) and not value.strip():
            msg = "SMTP_FROM must not be empty"
            raise ValueError(msg)
        return value


settings = Settings()