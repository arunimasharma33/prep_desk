import os
import secrets
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _get_or_create_secret() -> str:
    """Keep JWT_SECRET stable across restarts by persisting a generated one
    to .env if the user hasn't set one themselves."""
    env_path = BASE_DIR / ".env"
    secret = os.getenv("JWT_SECRET")
    if secret:
        return secret
    secret = secrets.token_hex(32)
    with open(env_path, "a") as f:
        f.write(f"\nJWT_SECRET={secret}\n")
    return secret


class Settings:
    _raw_mistral_keys: str = os.getenv("MISTRAL_API_KEYS") or os.getenv("MISTRAL_API_KEY", "")
    MISTRAL_API_KEYS: list = [k.strip() for k in _raw_mistral_keys.split(",") if k.strip()]
    MISTRAL_MODEL: str = os.getenv("MISTRAL_MODEL", "mistral-large-latest")
    JWT_SECRET: str = _get_or_create_secret()
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))  # 7 days
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'interview.db'}")
    GENERATED_PDF_DIR: Path = BASE_DIR / "generated_pdfs"
    NODE_PDF_SCRIPT: Path = BASE_DIR / "pdf_service" / "generate_pdf.js"
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

    # Email (for OTP verification / password reset)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "Prep Desk")
    OTP_EXPIRE_MINUTES: int = int(os.getenv("OTP_EXPIRE_MINUTES", "10"))

    @property
    def llm_enabled(self) -> bool:
        return bool(self.MISTRAL_API_KEYS)

    @property
    def smtp_enabled(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_USERNAME and self.SMTP_PASSWORD and self.SMTP_FROM_EMAIL)


settings = Settings()
settings.GENERATED_PDF_DIR.mkdir(parents=True, exist_ok=True)
