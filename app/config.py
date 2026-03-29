from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AliasChoices, Field
from typing import Optional

class Settings(BaseSettings):
    SECRET_KEY: str = Field(default='secret!')
    SQLALCHEMY_DATABASE_URI: str = Field(
        default='sqlite:///taskly.db',
        validation_alias=AliasChoices('DATABASE_URL', 'SQLALCHEMY_DATABASE_URI'),
    )
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = Field(default=False)
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None
    DEBUG: bool = Field(default=False)
    OAUTH_ALLOW_INSECURE: bool = Field(default=True)
    RUN_DB_CREATE_ALL: bool = Field(default=True)
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')
settings = Settings()
