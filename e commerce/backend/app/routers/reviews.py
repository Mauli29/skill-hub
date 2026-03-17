from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.utils.auth import get_current_user

router = APIRouter(prefix="/reviews", tags=["Reviews"])


# ── List reviews for a service ────────────────────────────────────────────────
@router.get("/service/{service_id}", response_model=List[schemas.ReviewOut])
def get_service_reviews(service_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Review)
        .filter(models.Review.service_id == service_id)
        .order_by(models.Review.created_at.desc())
        .all()
    )


# ── Create review ─────────────────────────────────────────────────────────────
@router.post("", response_model=schemas.ReviewOut, status_code=201)
def create_review(
    payload: schemas.ReviewCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    svc = db.query(models.Service).filter(models.Service.id == payload.service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    # Only clients who have a completed order can review
    completed = db.query(models.Order).filter(
        models.Order.service_id == payload.service_id,
        models.Order.client_id == current_user.id,
        models.Order.status == "completed",
    ).first()
    if not completed:
        raise HTTPException(
            status_code=403,
            detail="You can only review services after a completed order",
        )
    existing = db.query(models.Review).filter(
        models.Review.service_id == payload.service_id,
        models.Review.reviewer_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already reviewed this service")

    review = models.Review(
        service_id=payload.service_id,
        reviewer_id=current_user.id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(review)
    db.flush()

    # Update service aggregate rating
    all_reviews = db.query(models.Review).filter(
        models.Review.service_id == payload.service_id
    ).all()
    svc.rating = round(sum(r.rating for r in all_reviews) / len(all_reviews), 1)
    svc.review_count = len(all_reviews)
    db.commit()
    db.refresh(review)
    return review
