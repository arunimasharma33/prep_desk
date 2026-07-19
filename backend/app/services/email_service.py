import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import HTTPException

from app.config import settings


def send_email(to_email: str, subject: str, html_body: str, text_body: str | None = None):
    if not settings.smtp_enabled:
        raise HTTPException(
            status_code=500,
            detail=(
                "Email sending isn't configured yet. Set SMTP_HOST, SMTP_USERNAME, "
                "SMTP_PASSWORD, and SMTP_FROM_EMAIL in backend/.env, then restart the server."
            ),
        )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to_email

    if text_body:
        msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.starttls(context=context)
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(
            status_code=502,
            detail=(
                "The email provider rejected the SMTP credentials. Double-check SMTP_USERNAME/"
                "SMTP_PASSWORD in backend/.env (for Gmail, use an App Password, not your regular password)."
            ),
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Could not send email: {exc}")


def otp_email_html(heading: str, message: str, code: str) -> str:
    return f"""
    <div style="font-family: -apple-system, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color:#1E293B; margin-bottom: 8px;">{heading}</h2>
      <p style="color:#475569; font-size: 14px; line-height: 1.5;">{message}</p>
      <div style="font-size: 30px; font-weight: 700; letter-spacing: 8px; background:#F8FAFC;
                  padding: 18px 20px; border-radius: 10px; text-align:center; color:#0EA5E9; margin: 20px 0;">
        {code}
      </div>
      <p style="color:#94A3B8; font-size:12px;">
        This code expires in {settings.OTP_EXPIRE_MINUTES} minutes. If you didn't request this, you can
        safely ignore this email.
      </p>
    </div>
    """
