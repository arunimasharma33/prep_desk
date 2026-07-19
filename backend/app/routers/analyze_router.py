from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app import models_db as models, schemas, auth
from app.services import analyzer
from app.utils.file_extract import extract_text_from_upload

router = APIRouter(prefix="/api", tags=["analyze"])


@router.post("/resume/extract")
async def extract_resume_text(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
):
    raw = await file.read()
    text = extract_text_from_upload(file, raw)
    return {"resume_text": text}


def _to_response(record: models.Analysis) -> schemas.AnalyzeResponse:
    return schemas.AnalyzeResponse(
        id=record.id,
        job_title=record.job_title,
        company=record.company,
        job_description=record.job_description,
        resume_text=record.resume_text,
        match_score=record.match_score,
        result=record.result_json,
        created_at=record.created_at,
    )


@router.post("/analyze", response_model=schemas.AnalyzeResponse)
def analyze_job(
    payload: schemas.AnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    result = analyzer.analyze(
        job_title=payload.job_title,
        company=payload.company,
        job_description=payload.job_description,
        resume_text=payload.resume_text,
    )

    record = models.Analysis(
        user_id=current_user.id,
        job_title=payload.job_title,
        company=payload.company,
        job_description=payload.job_description,
        resume_text=payload.resume_text,
        match_score=result.get("match_score"),
        result_json=result,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return _to_response(record)


@router.get("/analyze/{analysis_id}", response_model=schemas.AnalyzeResponse)
def get_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    record = (
        db.query(models.Analysis)
        .filter(models.Analysis.id == analysis_id, models.Analysis.user_id == current_user.id)
        .first()
    )
    if not record:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return _to_response(record)


@router.delete("/analyze/{analysis_id}")
def delete_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    from fastapi import HTTPException
    record = (
        db.query(models.Analysis)
        .filter(models.Analysis.id == analysis_id, models.Analysis.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    db.delete(record)
    db.commit()
    return {"ok": True}


@router.get("/history/analyses", response_model=list[schemas.AnalysisSummary])
def list_analyses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    records = (
        db.query(models.Analysis)
        .filter(models.Analysis.user_id == current_user.id)
        .order_by(desc(models.Analysis.created_at))
        .all()
    )
    return records
