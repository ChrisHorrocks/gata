from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://gata:gata@localhost:5432/gata"
    smtp_host: str = "localhost"
    smtp_port: int = 1025


settings = Settings()
