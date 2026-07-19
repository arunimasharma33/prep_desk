from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app import models_db as models, schemas, auth
from app.services import resume_ai, pdf_render

router = APIRouter(prefix="/api/resume", tags=["resume"])

TEMPLATES = [
    {"id": "classic", "name": "ATS Classic", "description": "Pure black & white, serif, maximum ATS compatibility."},
    {"id": "modern", "name": "Modern Minimal", "description": "Clean sans-serif with a subtle accent color."},
    {"id": "compact", "name": "Compact", "description": "Dense single-page layout for longer work histories."},
]


@router.get("/templates")
def list_templates(current_user: models.User = Depends(auth.get_current_user)):
    return TEMPLATES


@router.post("/preview")
def preview_resume_html(
    payload: schemas.ResumePdfRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Render resume JSON to HTML (not PDF) for an in-browser preview / template gallery."""
    resume_json = payload.resume_json
    if not resume_json and payload.resume_id:
        record = (
            db.query(models.Resume)
            .filter(models.Resume.id == payload.resume_id, models.Resume.user_id == current_user.id)
            .first()
        )
        if not record:
            raise HTTPException(status_code=404, detail="Resume not found.")
        resume_json = record.resume_json
    if not resume_json:
        raise HTTPException(status_code=400, detail="resume_json or resume_id is required.")

    html = pdf_render.render_html(resume_json, template=payload.template or "classic")
    return {"html": html}


@router.post("/improve")
def improve_resume(
    payload: schemas.ResumeImproveRequest,
    current_user: models.User = Depends(auth.get_current_user),
):
    result = resume_ai.improve_resume(
        job_title=payload.job_title,
        job_description=payload.job_description,
        resume_text=payload.resume_text,
        missing_skills=payload.missing_skills or [],
    )
    return result


@router.post("", response_model=schemas.ResumeOut)
def save_resume(
    payload: schemas.ResumeSaveRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    record = models.Resume(
        user_id=current_user.id,
        analysis_id=payload.analysis_id,
        template=payload.template,
        title=payload.title,
        resume_json=payload.resume_json,
        suggestions_json=payload.suggestions or [],
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("", response_model=list[schemas.ResumeOut])
def list_resumes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return (
        db.query(models.Resume)
        .filter(models.Resume.user_id == current_user.id)
        .order_by(desc(models.Resume.created_at))
        .all()
    )


@router.get("/{resume_id}", response_model=schemas.ResumeOut)
def get_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    record = (
        db.query(models.Resume)
        .filter(models.Resume.id == resume_id, models.Resume.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Resume not found.")
    return record


@router.post("/pdf")
def generate_pdf(
    payload: schemas.ResumePdfRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Generate (and if resume_id given, persist path for) a PDF from resume JSON."""
    record = None
    if payload.resume_id:
        record = (
            db.query(models.Resume)
            .filter(models.Resume.id == payload.resume_id, models.Resume.user_id == current_user.id)
            .first()
        )
        if not record:
            raise HTTPException(status_code=404, detail="Resume not found.")
        resume_json = record.resume_json
        template = payload.template or record.template
    else:
        if not payload.resume_json:
            raise HTTPException(status_code=400, detail="resume_json or resume_id is required.")
        resume_json = payload.resume_json
        template = payload.template or "classic"

    out_name = f"resume_{record.id}" if record else None
    pdf_path = pdf_render.generate_resume_pdf(resume_json, template=template, out_name=out_name)

    if record:
        record.pdf_path = str(pdf_path)
        record.template = template
        db.commit()

    filename = f"{(resume_json.get('name') or 'resume').replace(' ', '_')}_resume.pdf"
    return FileResponse(path=str(pdf_path), media_type="application/pdf", filename=filename)


@router.get("/{resume_id}/pdf")
def download_saved_pdf(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    record = (
        db.query(models.Resume)
        .filter(models.Resume.id == resume_id, models.Resume.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Resume not found.")

    pdf_path = pdf_render.generate_resume_pdf(record.resume_json, template=record.template, out_name=f"resume_{record.id}")
    record.pdf_path = str(pdf_path)
    db.commit()

    filename = f"{(record.resume_json.get('name') or 'resume').replace(' ', '_')}_resume.pdf"
    return FileResponse(path=str(pdf_path), media_type="application/pdf", filename=filename)


@router.delete("/{resume_id}")
def delete_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    record = (
        db.query(models.Resume)
        .filter(models.Resume.id == resume_id, models.Resume.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Resume not found.")
    db.delete(record)
    db.commit()
    return {"ok": True}
