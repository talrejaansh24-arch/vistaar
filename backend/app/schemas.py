from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ── Auth Schemas ──
class UserRegister(BaseModel):
    email: EmailStr
    password: Optional[str] = None
    business_name: Optional[str] = None
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: Optional[str] = None
    force_logout: bool = False


class SendOTPRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str
    force_logout: bool = False


class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token
    force_logout: bool = False


class UserResponse(BaseModel):
    id: int
    email: str
    business_name: Optional[str]
    phone: Optional[str]
    role: str
    is_suspended: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Design Schemas ──
class DesignGenerateRequest(BaseModel):
    business_name: str
    bottle_text: Optional[str] = ""
    keywords: Optional[str] = ""
    category: Optional[str] = "general"  # hotel, restaurant, cafe, event, gym, corporate
    bottle_size: Optional[str] = "500ml"
    style: Optional[str] = "modern"  # modern, classic, minimal, luxury, eco


class GeneratedDesign(BaseModel):
    id: str
    name: str
    preview_url: str
    style: str
    colors: List[str]
    template_id: Optional[int] = None
    business_name: Optional[str] = None
    bottle_text: Optional[str] = None


class DesignGenerateResponse(BaseModel):
    designs: List[GeneratedDesign]
    count: int


class AIDesignGenerateRequest(BaseModel):
    prompt: str
    business_name: Optional[str] = "VISTAARWATER"
    count: Optional[int] = 3
    detail_level: Optional[str] = "medium"  # low | medium | high
    category: Optional[str] = "general"  # hotel | restaurant | cafe | event | gym | corporate | general
    style: Optional[str] = "modern"  # modern | premium | minimalist | luxury | eco
    enhance_prompt: Optional[bool] = True  # If True, enhance user prompt via Gemini before generation


class SaveDesignRequest(BaseModel):
    name: Optional[str] = "Untitled Design"
    canvas_json: str
    preview_url: Optional[str] = None
    template_id: Optional[int] = None


class SavedDesignResponse(BaseModel):
    id: int
    user_id: int
    name: Optional[str]
    canvas_json: Optional[str]
    preview_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Product Schemas ──
class ProductResponse(BaseModel):
    id: int
    name: str
    size: str
    base_price: float
    description: Optional[str]
    image_url: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    name: str
    size: str
    base_price: float
    description: Optional[str] = None
    image_url: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    size: Optional[str] = None
    base_price: Optional[float] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None


# ── Order Schemas ──
class OrderItemCreate(BaseModel):
    product_id: int
    design_json: Optional[str] = None
    design_preview_url: Optional[str] = None
    quantity: int


class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    shipping_address: str
    billing_address: Optional[str] = None
    payment_method: Optional[str] = "upi"
    notes: Optional[str] = None


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    design_preview_url: Optional[str]
    quantity: int
    unit_price: float
    subtotal: float

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    id: int
    user_id: int
    status: str
    total_price: float
    shipping_address: Optional[str]
    billing_address: Optional[str]
    payment_method: Optional[str]
    payment_status: str
    notes: Optional[str]
    items: List[OrderItemResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: str


# ── Inquiry Schemas ──
class InquiryCreate(BaseModel):
    name: str
    business_name: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    quantity: Optional[int] = None
    bottle_size: Optional[str] = None
    requirements: Optional[str] = None


class InquiryResponse(BaseModel):
    id: int
    name: str
    business_name: Optional[str]
    email: str
    phone: Optional[str]
    quantity: Optional[int]
    bottle_size: Optional[str]
    requirements: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Pricing Schemas ──
class PriceCalculateRequest(BaseModel):
    bottle_size: str
    quantity: int


class PriceCalculateResponse(BaseModel):
    bottle_size: str
    quantity: int
    base_price: float
    discount_percent: float
    unit_price: float
    total_price: float


# ── Admin Panel Dashboard & User Management Schemas ──
class UserStatusUpdate(BaseModel):
    is_suspended: bool


class DashboardMetricsResponse(BaseModel):
    total_users: int
    active_users_today: int
    new_signups: int
    total_designs_generated: int
    revenue_daily: float
    revenue_monthly: float
    revenue_yearly: float
    conversion_rate: float
    most_used_categories: List[dict]


# ── Design Template Schemas ──
class DesignTemplateResponse(BaseModel):
    id: int
    name: str
    category: str
    style: Optional[str]
    file_path: str
    colors: Optional[List[str]]
    created_at: datetime

    class Config:
        from_attributes = True


class DesignTemplateCreate(BaseModel):
    name: str
    category: str
    style: Optional[str] = "modern"
    file_path: str
    colors: Optional[List[str]] = []


# ── Admin Settings ──
class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class AdminUploadResponse(BaseModel):
    id: int
    filename: str
    file_path: str
    file_type: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
