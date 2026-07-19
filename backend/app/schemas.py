from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
import datetime


# ---------- Auth ----------
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class MessageResponse(BaseModel):
    message: str
    email: Optional[str] = None


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)


class ResendOtpRequest(BaseModel):
    email: EmailStr
    purpose: str = "register"  # "register" or "reset"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=6)


# ---------- Analyze ----------
class AnalyzeRequest(BaseModel):
    job_title: str
    company: Optional[str] = None
    job_description: str
    resume_text: Optional[str] = None


class AnalyzeResponse(BaseModel):
    id: int
    job_title: str
    company: Optional[str] = None
    job_description: str
    resume_text: Optional[str] = None
    match_score: Optional[float]
    result: Dict[str, Any]
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class AnalysisSummary(BaseModel):
    id: int
    job_title: str
    company: Optional[str]
    match_score: Optional[float]
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# ---------- Study Plan ----------
class PlanRequest(BaseModel):
    analysis_id: Optional[int] = None
    job_title: str
    days: int = Field(gt=0, le=180)
    hours_per_day: Optional[float] = 3
    missing_skills: Optional[List[str]] = None
    matched_skills: Optional[List[str]] = None
    job_description: Optional[str] = None


class PlanResponse(BaseModel):
    id: int
    days: int
    plan: List[Dict[str, Any]]
    progress: Dict[str, bool]
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class ProgressUpdate(BaseModel):
    day: int
    completed: bool


# ---------- Resume ----------
class ResumeImproveRequest(BaseModel):
    analysis_id: Optional[int] = None
    resume_text: Optional[str] = None
    job_title: str
    job_description: str
    missing_skills: Optional[List[str]] = None


class ResumeSaveRequest(BaseModel):
    analysis_id: Optional[int] = None
    title: str = "My Resume"
    template: str = "classic"
    resume_json: Dict[str, Any]
    suggestions: Optional[List[str]] = None


class ResumeOut(BaseModel):
    id: int
    title: str
    template: str
    resume_json: Dict[str, Any]
    suggestions_json: Optional[List[str]]
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class ResumePdfRequest(BaseModel):
    resume_id: Optional[int] = None
    template: Optional[str] = None
    resume_json: Optional[Dict[str, Any]] = None
