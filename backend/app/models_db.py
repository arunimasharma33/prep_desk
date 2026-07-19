import datetime
from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime, JSON, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


def now():
    return datetime.datetime.utcnow()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    otp_code = Column(String, nullable=True)
    otp_purpose = Column(String, nullable=True)  # "register" or "reset"
    otp_expires_at = Column(DateTime, nullable=True)
    otp_attempts = Column(Integer, default=0)
    created_at = Column(DateTime, default=now)

    analyses = relationship("Analysis", back_populates="owner", cascade="all, delete-orphan")
    plans = relationship("StudyPlan", back_populates="owner", cascade="all, delete-orphan")
    resumes = relationship("Resume", back_populates="owner", cascade="all, delete-orphan")


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_title = Column(String, nullable=False)
    company = Column(String, nullable=True)
    job_description = Column(Text, nullable=False)
    resume_text = Column(Text, nullable=True)
    match_score = Column(Float, nullable=True)
    result_json = Column(JSON, nullable=False)  # full LLM response: skills, questions, etc.
    created_at = Column(DateTime, default=now)

    owner = relationship("User", back_populates="analyses")
    plans = relationship("StudyPlan", back_populates="analysis", cascade="all, delete-orphan")
    resumes = relationship("Resume", back_populates="analysis", cascade="all, delete-orphan")


class StudyPlan(Base):
    __tablename__ = "study_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=True)
    days = Column(Integer, nullable=False)
    plan_json = Column(JSON, nullable=False)       # list of day objects
    progress_json = Column(JSON, default=dict)     # {"1": true, "2": false, ...}
    created_at = Column(DateTime, default=now)

    owner = relationship("User", back_populates="plans")
    analysis = relationship("Analysis", back_populates="plans")


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=True)
    template = Column(String, default="classic")
    title = Column(String, default="My Resume")
    resume_json = Column(JSON, nullable=False)
    suggestions_json = Column(JSON, nullable=True)
    pdf_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=now)

    owner = relationship("User", back_populates="resumes")
    analysis = relationship("Analysis", back_populates="resumes")
