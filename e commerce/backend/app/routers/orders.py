import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.utils.auth import get_current_user

router = APIRouter(prefix="/orders", tags=["Orders"])


# ── Create order (client places order, Razorpay order created in payments router) ──
@router.post("", response_model=schemas.OrderOut, status_code=201)
def create_order(
    payload: schemas.OrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    svc = db.query(models.Service).filter(
        models.Service.id == payload.service_id,
        models.Service.is_active == True,
    ).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    if svc.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot order your own service")
    order = models.Order(
        service_id=svc.id,
        client_id=current_user.id,
        freelancer_id=svc.owner_id,
        amount=svc.price,
        status="pending",
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


# ── Get my orders (client view) ───────────────────────────────────────────────
@router.get("/my", response_model=List[schemas.OrderOut])
def my_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role == "freelancer":
        orders = (
            db.query(models.Order)
            .filter(models.Order.freelancer_id == current_user.id)
            .order_by(models.Order.created_at.desc())
            .all()
        )
    else:
        orders = (
            db.query(models.Order)
            .filter(models.Order.client_id == current_user.id)
            .order_by(models.Order.created_at.desc())
            .all()
        )
    return orders


# ── Freelancer stats ───────────────────────────────────────────────────────────
@router.get("/stats/freelancer")
def freelancer_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in ("freelancer", "admin"):
        raise HTTPException(status_code=403, detail="Freelancers only")
    all_orders = db.query(models.Order).filter(
        models.Order.freelancer_id == current_user.id
    ).all()
    total_earnings = sum(o.amount for o in all_orders if o.status == "completed")
    active_orders = sum(1 for o in all_orders if o.status == "active")
    completed = sum(1 for o in all_orders if o.status == "completed")
    return {
        "total_earnings": total_earnings,
        "active_orders": active_orders,
        "completed_projects": completed,
    }


# ── Client stats ───────────────────────────────────────────────────────────────
@router.get("/stats/client")
def client_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    all_orders = db.query(models.Order).filter(
        models.Order.client_id == current_user.id
    ).all()
    open_projects = sum(1 for o in all_orders if o.status in ("pending", "active"))
    total_spent = sum(o.amount for o in all_orders if o.status == "completed")
    hired = len(set(o.freelancer_id for o in all_orders))
    return {
        "open_projects": open_projects,
        "total_spent": total_spent,
        "hired_freelancers": hired,
    }


# ── Get single order ──────────────────────────────────────────────────────────
@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.client_id != current_user.id and order.freelancer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorised")
    return order


# ── Update order status ───────────────────────────────────────────────────────
@router.put("/{order_id}/status", response_model=schemas.OrderOut)
def update_order_status(
    order_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    allowed = ("pending", "active", "completed", "cancelled")
    if status not in allowed:
        raise HTTPException(status_code=400, detail=f"Status must be one of {allowed}")
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.freelancer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only the freelancer can update status")
    order.status = status
    db.commit()
    db.refresh(order)
    return order
