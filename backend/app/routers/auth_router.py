from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models_db as models, schemas, auth
from app.services import otp_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.MessageResponse)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()

    if existing and existing.is_verified:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    if existing and not existing.is_verified:
        # Re-registering before verifying - just refresh their details and resend a code.
        existing.name = payload.name
        existing.hashed_password = auth.hash_password(payload.password)
        user = existing
    else:
        user = models.User(
            name=payload.name,
            email=payload.email,
            hashed_password=auth.hash_password(payload.password),
            is_verified=False,
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    otp_service.issue_otp(user, "register", db)

    return schemas.MessageResponse(
        message=f"We sent a 6-digit verification code to {user.email}.",
        email=user.email,
    )


@router.post("/verify-otp", response_model=schemas.Token)
def verify_registration_otp(payload: schemas.VerifyOtpRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with that email.")

    ok, error = otp_service.verify_otp(user, payload.otp, "register", db)
    if not ok:
        raise HTTPException(status_code=400, detail=error)

    user.is_verified = True
    db.commit()
    db.refresh(user)

    token = auth.create_access_token({"sub": str(user.id)})
    return schemas.Token(access_token=token, user=schemas.UserOut.model_validate(user))


@router.post("/resend-otp", response_model=schemas.MessageResponse)
def resend_otp(payload: schemas.ResendOtpRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with that email.")

    if payload.purpose == "register" and user.is_verified:
        raise HTTPException(status_code=400, detail="This account is already verified — try signing in.")

    otp_service.issue_otp(user, payload.purpose, db)
    return schemas.MessageResponse(message=f"We sent a new code to {user.email}.", email=user.email)


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not auth.verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email before signing in. We can resend the code if you need it.",
        )

    token = auth.create_access_token({"sub": str(user.id)})
    return schemas.Token(access_token=token, user=schemas.UserOut.model_validate(user))


@router.post("/forgot-password", response_model=schemas.MessageResponse)
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with that email.")

    otp_service.issue_otp(user, "reset", db)
    return schemas.MessageResponse(message=f"We sent a password reset code to {user.email}.", email=user.email)


@router.post("/reset-password", response_model=schemas.Token)
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with that email.")

    ok, error = otp_service.verify_otp(user, payload.otp, "reset", db)
    if not ok:
        raise HTTPException(status_code=400, detail=error)

    user.hashed_password = auth.hash_password(payload.new_password)
    user.is_verified = True  # a successful email-code reset also proves ownership
    db.commit()
    db.refresh(user)

    token = auth.create_access_token({"sub": str(user.id)})
    return schemas.Token(access_token=token, user=schemas.UserOut.model_validate(user))


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user
