import os, hmac, hashlib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.utils.auth import get_current_user

router = APIRouter(prefix="/payments", tags=["Payments"])

RAZORPAY_KEY_ID     = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")


def _razorpay_client():
    try:
        import razorpay
        return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    except Exception:
        return None


# ── Create Razorpay order ──────────────────────────────────────────────────────
@router.post("/create-order")
def create_razorpay_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your order")

    client = _razorpay_client()
    if not client:
        raise HTTPException(status_code=500, detail="Razorpay not configured")

    amount_paise = int(order.amount * 100)
    rz_order = client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": f"order_{order.id}",
        "payment_capture": 1,
    })
    order.razorpay_order_id = rz_order["id"]
    db.commit()
    return {
        "razorpay_order_id": rz_order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "key": RAZORPAY_KEY_ID,
        "order_id": order.id,
        "service_title": order.service.title if order.service else "",
    }


# ── Verify payment signature ───────────────────────────────────────────────────
@router.post("/verify")
def verify_payment(
    payload: schemas.PaymentVerify,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    order = db.query(models.Order).filter(models.Order.id == payload.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your order")

    # Verify HMAC signature
    body = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}"
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        body.encode(),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, payload.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    order.razorpay_payment_id = payload.razorpay_payment_id
    order.status = "active"
    db.commit()
    return {"success": True, "message": "Payment verified. Order is now active."}
