from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


# ── Auth ──────────────────────────────────────────────────────────────────────
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "client"  # client | freelancer


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# ── User ──────────────────────────────────────────────────────────────────────
class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    bio: Optional[str]
    avatar: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None


# ── Category ──────────────────────────────────────────────────────────────────
class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    icon: str

    class Config:
        from_attributes = True


# ── Service ───────────────────────────────────────────────────────────────────
class ServiceCreate(BaseModel):
    title: str
    description: Optional[str] = None
    price: float
    category_id: Optional[int] = None


class ServiceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category_id: Optional[int] = None
    is_active: Optional[bool] = None


class ServiceOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    price: float
    image: Optional[str]
    rating: float
    review_count: int
    is_active: bool
    created_at: datetime
    owner: UserOut
    category: Optional[CategoryOut]

    class Config:
        from_attributes = True


# ── Order ─────────────────────────────────────────────────────────────────────
class OrderCreate(BaseModel):
    service_id: int


class OrderOut(BaseModel):
    id: int
    service_id: int
    client_id: int
    freelancer_id: int
    status: str
    amount: float
    razorpay_order_id: Optional[str]
    created_at: datetime
    service: Optional[dict] = None

    class Config:
        from_attributes = True


# ── Message ───────────────────────────────────────────────────────────────────
class MessageCreate(BaseModel):
    receiver_id: int
    content: str
    order_id: Optional[int] = None


class MessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    order_id: Optional[int]
    content: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Review ────────────────────────────────────────────────────────────────────
class ReviewCreate(BaseModel):
    service_id: int
    rating: int
    comment: Optional[str] = None


class ReviewOut(BaseModel):
    id: int
    service_id: int
    reviewer_id: int
    rating: int
    comment: Optional[str]
    created_at: datetime
    reviewer: UserOut

    class Config:
        from_attributes = True


# ── Payment ───────────────────────────────────────────────────────────────────
class PaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    order_id: int
