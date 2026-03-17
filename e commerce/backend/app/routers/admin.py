from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.utils.auth import require_admin

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Platform stats ─────────────────────────────────────────────────────────────
@router.get("/stats")
def admin_stats(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    return {
        "total_users":      db.query(models.User).count(),
        "total_freelancers": db.query(models.User).filter(models.User.role == "freelancer").count(),
        "total_clients":    db.query(models.User).filter(models.User.role == "client").count(),
        "total_services":   db.query(models.Service).count(),
        "active_services":  db.query(models.Service).filter(models.Service.is_active == True).count(),
        "total_orders":     db.query(models.Order).count(),
        "completed_orders": db.query(models.Order).filter(models.Order.status == "completed").count(),
        "total_revenue":    sum(
                                r[0] for r in db.query(models.Order.amount)
                                .filter(models.Order.status == "completed").all()
                            ),
    }


# ── List all users ─────────────────────────────────────────────────────────────
@router.get("/users", response_model=List[schemas.UserOut])
def admin_list_users(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    return db.query(models.User).offset(skip).limit(limit).all()


# ── Toggle user active status ─────────────────────────────────────────────────
@router.put("/users/{user_id}/toggle", response_model=schemas.UserOut)
def admin_toggle_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return user


# ── List all services ─────────────────────────────────────────────────────────
@router.get("/services", response_model=List[schemas.ServiceOut])
def admin_list_services(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    return db.query(models.Service).offset(skip).limit(limit).all()


# ── Delete any service ────────────────────────────────────────────────────────
@router.delete("/services/{service_id}", status_code=204)
def admin_delete_service(
    service_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    svc = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    db.delete(svc)
    db.commit()


# ── List all orders ────────────────────────────────────────────────────────────
@router.get("/orders")
def admin_list_orders(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    orders = db.query(models.Order).offset(skip).limit(limit).all()
    result = []
    for o in orders:
        result.append({
            "id": o.id,
            "service_title": o.service.title if o.service else "",
            "client_name": o.client.name if o.client else "",
            "freelancer_name": o.freelancer.name if o.freelancer else "",
            "amount": o.amount,
            "status": o.status,
            "created_at": o.created_at.isoformat(),
        })
    return result


# ── Seed default categories ───────────────────────────────────────────────────
@router.post("/seed-categories", status_code=201)
def seed_categories(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    defaults = [
        {"name": "Logo Design",       "slug": "logo-design",       "icon": "🎨"},
        {"name": "Web Development",   "slug": "web-development",   "icon": "💻"},
        {"name": "Content Writing",   "slug": "content-writing",   "icon": "✍️"},
        {"name": "Video Editing",     "slug": "video-editing",     "icon": "🎬"},
        {"name": "SEO",               "slug": "seo",               "icon": "📈"},
        {"name": "App Development",   "slug": "app-development",   "icon": "📱"},
        {"name": "Digital Marketing", "slug": "digital-marketing", "icon": "📣"},
        {"name": "Data Entry",        "slug": "data-entry",        "icon": "📋"},
    ]
    added = 0
    for cat in defaults:
        exists = db.query(models.Category).filter(models.Category.slug == cat["slug"]).first()
        if not exists:
            db.add(models.Category(**cat))
            added += 1
    db.commit()
    return {"added": added, "message": f"{added} categories seeded"}
