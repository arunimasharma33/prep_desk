from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app import models_db  # noqa: F401  (ensures models are registered before create_all)
from app.config import settings
from app.routers import auth_router, analyze_router, plan_router, resume_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Interview Prep Platform", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(analyze_router.router)
app.include_router(plan_router.router)
app.include_router(resume_router.router)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "llm_enabled": settings.llm_enabled,
        "mistral_keys_configured": len(settings.MISTRAL_API_KEYS),
        "model": settings.MISTRAL_MODEL,
        "email_enabled": settings.smtp_enabled,
    }
