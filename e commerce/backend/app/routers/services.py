import os, shutil
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.utils.auth import get_current_user

router = APIRouter(prefix="/services", tags=["Services"])
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "static/uploads")


# ── Public: list / search ──────────────────────────────────────────────────────
@router.get("", response_model=List[schemas.ServiceOut])
def list_services(
    search: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(models.Service).filter(models.Service.is_active == True)
    if search:
        q = q.filter(models.Service.title.ilike(f"%{search}%"))
    if category_id:
        q = q.filter(models.Service.category_id == category_id)
    if min_price is not None:
        q = q.filter(models.Service.price >= min_price)
    if max_price is not None:
        q = q.filter(models.Service.price <= max_price)
    return q.order_by(models.Service.created_at.desc()).offset(skip).limit(limit).all()


# ── Public: get categories ─────────────────────────────────────────────────────
@router.get("/categories", response_model=List[schemas.CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()


# ── Public: single service ─────────────────────────────────────────────────────
@router.get("/{service_id}", response_model=schemas.ServiceOut)
def get_service(service_id: int, db: Session = Depends(get_db)):
    svc = db.query(models.Service).filter(
        models.Service.id == service_id,
        models.Service.is_active == True,
    ).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    return svc


# ── Authenticated: create service ─────────────────────────────────────────────
@router.post("", response_model=schemas.ServiceOut, status_code=201)
def create_service(
    payload: schemas.ServiceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in ("freelancer", "admin"):
        raise HTTPException(status_code=403, detail="Only freelancers can create services")
    svc = models.Service(
        owner_id=current_user.id,
        title=payload.title,
        description=payload.description,
        price=payload.price,
        category_id=payload.category_id,
    )
    db.add(svc)
    db.commit()
    db.refresh(svc)
    return svc


# ── Authenticated: update service ─────────────────────────────────────────────
@router.put("/{service_id}", response_model=schemas.ServiceOut)
def update_service(
    service_id: int,
    payload: schemas.ServiceUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    svc = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    if svc.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorised")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(svc, field, value)
    db.commit()
    db.refresh(svc)
    return svc


# ── Authenticated: delete service ─────────────────────────────────────────────
@router.delete("/{service_id}", status_code=204)
def delete_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    svc = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    if svc.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorised")
    db.delete(svc)
    db.commit()


# ── Authenticated: upload service image ───────────────────────────────────────
@router.post("/{service_id}/image", response_model=schemas.ServiceOut)
def upload_service_image(
    service_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    svc = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    if svc.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorised")
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp"):
        raise HTTPException(status_code=400, detail="Only jpg/png/webp allowed")
    svc_dir = os.path.join(UPLOAD_DIR, "services")
    os.makedirs(svc_dir, exist_ok=True)
    filename = f"service_{service_id}.{ext}"
    path = os.path.join(svc_dir, filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    svc.image = f"/static/uploads/services/{filename}"
    db.commit()
    db.refresh(svc)
    return svc


# ── Authenticated: my services ────────────────────────────────────────────────
@router.get("/my/listings", response_model=List[schemas.ServiceOut])
def my_services(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Service)
        .filter(models.Service.owner_id == current_user.id)
        .order_by(models.Service.created_at.desc())
        .all()
    )
