import random
import datetime
from sqlalchemy.orm import Session

from app import models_db as models
from app.config import settings
from app.services.email_service import send_email, otp_email_html

MAX_OTP_ATTEMPTS = 5


def _generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def issue_otp(user: models.User, purpose: str, db: Session):
    """Generate a fresh OTP, store it, email it. purpose is 'register' or 'reset'."""
    code = _generate_code()
    user.otp_code = code
    user.otp_purpose = purpose
    user.otp_expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
    user.otp_attempts = 0
    db.commit()

    if purpose == "register":
        subject = "Verify your Prep Desk account"
        heading = "Confirm your email"
        message = "Use the code below to verify your account and finish signing up."
    else:
        subject = "Reset your Prep Desk password"
        heading = "Reset your password"
        message = "Use the code below to reset your password."

    send_email(user.email, subject, otp_email_html(heading, message, code))


def verify_otp(user: models.User, code: str, purpose: str, db: Session) -> tuple[bool, str | None]:
    """Returns (ok, error_message)."""
    if not user.otp_code or user.otp_purpose != purpose:
        return False, "No pending code for this action. Request a new one."

    if user.otp_expires_at is None or datetime.datetime.utcnow() > user.otp_expires_at:
        return False, "This code has expired. Request a new one."

    if (user.otp_attempts or 0) >= MAX_OTP_ATTEMPTS:
        return False, "Too many incorrect attempts. Request a new code."

    if user.otp_code != code.strip():
        user.otp_attempts = (user.otp_attempts or 0) + 1
        db.commit()
        return False, "That code is incorrect."

    # Success - clear the OTP so it can't be reused
    user.otp_code = None
    user.otp_purpose = None
    user.otp_expires_at = None
    user.otp_attempts = 0
    db.commit()
    return True, None
