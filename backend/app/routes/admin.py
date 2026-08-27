import os
import datetime
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Order, Product, SavedDesign, Inquiry, DesignTemplate, AdminUpload
from app.schemas import (
    OrderResponse, OrderStatusUpdate, ProductCreate, ProductUpdate,
    ProductResponse, InquiryResponse, SavedDesignResponse,
    UserResponse, UserStatusUpdate, DashboardMetricsResponse,
    DesignTemplateResponse, DesignTemplateCreate, ChangePasswordRequest,
    AdminUploadResponse,
)
from app.auth import get_current_admin, verify_password, hash_password
from app.config import TEMPLATES_DIR, UPLOADS_DIR

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Orders ──
@router.get("/orders", response_model=list[OrderResponse])
def list_all_orders(
    status: str = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all orders (admin only)."""
    query = db.query(Order).order_by(Order.created_at.desc())
    if status:
        query = query.filter(Order.status == status)
    return [OrderResponse.model_validate(o) for o in query.all()]


@router.patch("/orders/{order_id}", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update order status (admin only)."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = data.status
    db.commit()
    db.refresh(order)
    return OrderResponse.model_validate(order)


# ── Products ──
@router.post("/products", response_model=ProductResponse)
def create_product(
    data: ProductCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Create a new product (admin only)."""
    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return ProductResponse.model_validate(product)


@router.patch("/products/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    data: ProductUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update a product (admin only)."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return ProductResponse.model_validate(product)


@router.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete a product (admin only)."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"message": "Product deleted"}


# ── Designs ──
@router.get("/designs", response_model=list[SavedDesignResponse])
def list_all_designs(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all saved designs (admin only)."""
    designs = db.query(SavedDesign).order_by(SavedDesign.created_at.desc()).all()
    return [SavedDesignResponse.model_validate(d) for d in designs]


# ── Inquiries ──
@router.get("/inquiries", response_model=list[InquiryResponse])
def list_all_inquiries(
    status: str = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all inquiries (admin only)."""
    query = db.query(Inquiry).order_by(Inquiry.created_at.desc())
    if status:
        query = query.filter(Inquiry.status == status)
    return [InquiryResponse.model_validate(i) for i in query.all()]


@router.patch("/inquiries/{inquiry_id}")
def update_inquiry_status(
    inquiry_id: int,
    status: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update inquiry status (admin only)."""
    inquiry = db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    inquiry.status = status
    db.commit()
    return {"message": "Inquiry status updated"}


# ── Users & Management ──
@router.get("/users", response_model=list[UserResponse])
def list_all_users(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all registered users (admin only)."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [UserResponse.model_validate(u) for u in users]


@router.patch("/users/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: int,
    data: UserStatusUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Suspend or unsuspend a user account (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot suspend an admin account")
    user.is_suspended = data.is_suspended
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


# ── B2B Business Dashboard Metrics ──
@router.get("/metrics", response_model=DashboardMetricsResponse)
def get_dashboard_metrics(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Retrieve dashboard high-level B2B business metrics (admin only)."""
    total_users = db.query(User).count()
    
    today_start = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Active Users (users with designs or orders today)
    users_with_designs = db.query(SavedDesign.user_id).filter(SavedDesign.created_at >= today_start).distinct().all()
    users_with_orders = db.query(Order.user_id).filter(Order.created_at >= today_start).distinct().all()
    active_user_ids = set([u[0] for u in users_with_designs] + [o[0] for o in users_with_orders])
    active_users_today = max(len(active_user_ids), 1)
    
    new_signups = db.query(User).filter(User.created_at >= today_start).count()
    
    # In B2B label editing: Total designs generated
    total_designs_generated = db.query(SavedDesign).count()
    
    # Daily / Monthly / Yearly Revenues
    daily_orders = db.query(Order).filter(Order.created_at >= today_start, Order.status != 'cancelled').all()
    rev_daily = sum(o.total_price for o in daily_orders)
    
    month_start = datetime.datetime.utcnow() - datetime.timedelta(days=30)
    monthly_orders = db.query(Order).filter(Order.created_at >= month_start, Order.status != 'cancelled').all()
    rev_monthly = sum(o.total_price for o in monthly_orders)
    
    year_start = datetime.datetime.utcnow() - datetime.timedelta(days=365)
    yearly_orders = db.query(Order).filter(Order.created_at >= year_start, Order.status != 'cancelled').all()
    rev_yearly = sum(o.total_price for o in yearly_orders)
    
    # Conversion rate: % of users who placed at least 1 order
    users_with_orders_count = db.query(Order.user_id).distinct().count()
    conversion_rate = (users_with_orders_count / total_users * 100) if total_users > 0 else 0.0
    
    # Query to count saved designs per category from real DB
    from sqlalchemy import func
    most_used = []
    category_display_names = {
        "hotel": "Hotel & Hospitality",
        "cafe": "Cafes & Coffee Shops",
        "gym": "Gyms & Fitness Centers",
        "corporate": "Corporate Events",
        "restaurant": "Restaurants & Dine-in",
        "event": "Special Events & Parties",
        "general": "General Custom Branding"
    }
    try:
        category_counts = (
            db.query(DesignTemplate.category, func.count(SavedDesign.id))
            .join(SavedDesign, SavedDesign.template_id == DesignTemplate.id)
            .group_by(DesignTemplate.category)
            .order_by(func.count(SavedDesign.id).desc())
            .limit(5)
            .all()
        )
        for cat, count in category_counts:
            display_name = category_display_names.get(cat.lower(), cat.capitalize())
            most_used.append({"category": display_name, "count": count})
    except Exception as e:
        print(f"[Metrics] Category join query warning: {e}")

    # Supplement if fewer than 5 categories exist
    if len(most_used) < 5:
        try:
            all_templates = db.query(DesignTemplate.category).distinct().all()
            for t_cat in all_templates:
                cat_name = t_cat[0]
                display_name = category_display_names.get(cat_name.lower(), cat_name.capitalize())
                cnt = db.query(SavedDesign).join(DesignTemplate).filter(DesignTemplate.category == cat_name).count()
                
                # Check if already added
                if not any(m["category"] == display_name for m in most_used):
                    most_used.append({"category": display_name, "count": cnt})
            
            most_used.sort(key=lambda x: x["count"], reverse=True)
            most_used = most_used[:5]
        except Exception as e:
            print(f"[Metrics] Category fill query warning: {e}")

    # Fallback to defaults if DB is completely empty and throws error
    if not most_used:
        most_used = [
            {"category": "Hotel & Hospitality", "count": 0},
            {"category": "Cafes & Coffee Shops", "count": 0},
            {"category": "Gyms & Fitness Centers", "count": 0},
            {"category": "Corporate Events", "count": 0},
            {"category": "Restaurants & Dine-in", "count": 0}
        ]
    
    return DashboardMetricsResponse(
        total_users=total_users,
        active_users_today=active_users_today,
        new_signups=new_signups,
        total_designs_generated=total_designs_generated,
        revenue_daily=rev_daily,
        revenue_monthly=rev_monthly,
        revenue_yearly=rev_yearly,
        conversion_rate=round(conversion_rate, 2),
        most_used_categories=most_used
    )


# ── Settings & Password Change ──
@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Change admin password."""
    if not verify_password(data.old_password, admin.password_hash):
        raise HTTPException(status_code=400, detail="Invalid current password")
    
    admin.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


# ── Custom Design Templates Management ──
@router.get("/templates", response_model=list[DesignTemplateResponse])
def list_templates(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all design templates (admin only)."""
    return db.query(DesignTemplate).order_by(DesignTemplate.created_at.desc()).all()


@router.post("/templates", response_model=DesignTemplateResponse)
def create_template(
    data: DesignTemplateCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Create a new custom design template (admin only)."""
    template = DesignTemplate(**data.model_dump())
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.delete("/templates/{template_id}")
def delete_template(
    template_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete a custom template (admin only)."""
    template = db.query(DesignTemplate).filter(DesignTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(template)
    db.commit()
    return {"message": "Template deleted successfully"}


@router.post("/templates/upload")
def upload_template_image(
    file: UploadFile = File(...),
    admin: User = Depends(get_current_admin),
):
    """Upload a template image (admin only)."""
    filename = f"custom_{int(datetime.datetime.utcnow().timestamp())}_{file.filename}"
    file_path = TEMPLATES_DIR / filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"file_path": f"/static/templates/{filename}"}


# ── Generic Document & File Uploads Manager ──
@router.post("/uploads", response_model=AdminUploadResponse)
def upload_admin_file(
    file: UploadFile = File(...),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Upload any file format (PDF, PNG, JPG, SVG, ZIP, etc.) to the asset library."""
    # Create safe unique filename
    timestamp = int(datetime.datetime.utcnow().timestamp())
    safe_filename = f"{timestamp}_{file.filename.replace(' ', '_')}"
    file_path = UPLOADS_DIR / safe_filename
    
    # Save file to uploads folder
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Get file type extension
    ext = os.path.splitext(file.filename)[1].replace('.', '').lower()
    
    # Save DB record
    db_upload = AdminUpload(
        filename=file.filename,
        file_path=f"/static/uploads/{safe_filename}",
        file_type=ext
    )
    db.add(db_upload)
    db.commit()
    db.refresh(db_upload)
    return db_upload


@router.get("/uploads", response_model=list[AdminUploadResponse])
def list_admin_uploads(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all generic file uploads (admin only)."""
    return db.query(AdminUpload).order_by(AdminUpload.created_at.desc()).all()


@router.delete("/uploads/{upload_id}")
def delete_admin_upload(
    upload_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete a generic file upload (admin only)."""
    upload = db.query(AdminUpload).filter(AdminUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="File not found")
        
    # Remove physical file if exists
    try:
        filename = os.path.basename(upload.file_path)
        physical_path = UPLOADS_DIR / filename
        if physical_path.exists():
            physical_path.unlink()
    except Exception as e:
        print(f"[Admin Uploads] Error deleting physical file: {e}")
        
    db.delete(upload)
    db.commit()
    return {"message": "File deleted successfully"}
