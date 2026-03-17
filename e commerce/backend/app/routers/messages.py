from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.utils.auth import get_current_user

router = APIRouter(prefix="/messages", tags=["Messages"])


# ── Send message ──────────────────────────────────────────────────────────────
@router.post("", response_model=schemas.MessageOut, status_code=201)
def send_message(
    payload: schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if payload.receiver_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    receiver = db.query(models.User).filter(models.User.id == payload.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Recipient not found")
    msg = models.Message(
        sender_id=current_user.id,
        receiver_id=payload.receiver_id,
        order_id=payload.order_id,
        content=payload.content,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


# ── Get conversation with a user ──────────────────────────────────────────────
@router.get("/conversation/{other_user_id}", response_model=List[schemas.MessageOut])
def get_conversation(
    other_user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    messages = (
        db.query(models.Message)
        .filter(
            or_(
                and_(
                    models.Message.sender_id == current_user.id,
                    models.Message.receiver_id == other_user_id,
                ),
                and_(
                    models.Message.sender_id == other_user_id,
                    models.Message.receiver_id == current_user.id,
                ),
            )
        )
        .order_by(models.Message.created_at.asc())
        .all()
    )
    # Mark received messages as read
    for m in messages:
        if m.receiver_id == current_user.id and not m.is_read:
            m.is_read = True
    db.commit()
    return messages


# ── List all my conversations (latest message per contact) ────────────────────
@router.get("/inbox")
def get_inbox(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    messages = (
        db.query(models.Message)
        .filter(
            or_(
                models.Message.sender_id == current_user.id,
                models.Message.receiver_id == current_user.id,
            )
        )
        .order_by(models.Message.created_at.desc())
        .all()
    )
    seen = set()
    conversations = []
    for msg in messages:
        other_id = msg.receiver_id if msg.sender_id == current_user.id else msg.sender_id
        if other_id not in seen:
            seen.add(other_id)
            other = db.query(models.User).filter(models.User.id == other_id).first()
            conversations.append({
                "user_id": other_id,
                "user_name": other.name if other else "Unknown",
                "user_avatar": other.avatar if other else None,
                "last_message": msg.content,
                "last_time": msg.created_at.isoformat(),
                "unread": db.query(models.Message).filter(
                    models.Message.sender_id == other_id,
                    models.Message.receiver_id == current_user.id,
                    models.Message.is_read == False,
                ).count(),
            })
    return conversations
