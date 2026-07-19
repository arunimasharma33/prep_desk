from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app import models_db as models, schemas, auth
from app.services import planner

router = APIRouter(prefix="/api/plan", tags=["plan"])


@router.post("", response_model=schemas.PlanResponse)
def create_plan(
    payload: schemas.PlanRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    result = planner.generate_plan(
        job_title=payload.job_title,
        job_description=payload.job_description or "",
        days=payload.days,
        hours_per_day=payload.hours_per_day or 3,
        matched_skills=payload.matched_skills or [],
        missing_skills=payload.missing_skills or [],
    )

    record = models.StudyPlan(
        user_id=current_user.id,
        analysis_id=payload.analysis_id,
        days=payload.days,
        plan_json=result["days"],
        progress_json={},
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return schemas.PlanResponse(
        id=record.id, days=record.days, plan=record.plan_json,
        progress=record.progress_json or {}, created_at=record.created_at,
    )


@router.get("/{plan_id}", response_model=schemas.PlanResponse)
def get_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    record = (
        db.query(models.StudyPlan)
        .filter(models.StudyPlan.id == plan_id, models.StudyPlan.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Plan not found.")
    return schemas.PlanResponse(
        id=record.id, days=record.days, plan=record.plan_json,
        progress=record.progress_json or {}, created_at=record.created_at,
    )


@router.patch("/{plan_id}/progress", response_model=schemas.PlanResponse)
def update_progress(
    plan_id: int,
    payload: schemas.ProgressUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    record = (
        db.query(models.StudyPlan)
        .filter(models.StudyPlan.id == plan_id, models.StudyPlan.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Plan not found.")

    progress = dict(record.progress_json or {})
    progress[str(payload.day)] = payload.completed
    record.progress_json = progress
    db.commit()
    db.refresh(record)

    return schemas.PlanResponse(
        id=record.id, days=record.days, plan=record.plan_json,
        progress=record.progress_json or {}, created_at=record.created_at,
    )


@router.delete("/{plan_id}")
def delete_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    record = (
        db.query(models.StudyPlan)
        .filter(models.StudyPlan.id == plan_id, models.StudyPlan.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Plan not found.")
    db.delete(record)
    db.commit()
    return {"ok": True}


@router.get("", response_model=list[schemas.PlanResponse])
def list_plans(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    records = (
        db.query(models.StudyPlan)
        .filter(models.StudyPlan.user_id == current_user.id)
        .order_by(desc(models.StudyPlan.created_at))
        .all()
    )
    return [
        schemas.PlanResponse(
            id=r.id, days=r.days, plan=r.plan_json, progress=r.progress_json or {}, created_at=r.created_at
        )
        for r in records
    ]
