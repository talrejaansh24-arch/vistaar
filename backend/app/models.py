import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    business_name = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    role = Column(String(20), default="user")  # "user" or "admin"
    is_suspended = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    orders = relationship("Order", back_populates="user")
    saved_designs = relationship("SavedDesign", back_populates="user")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    size = Column(String(50), nullable=False)  # "250ml", "500ml", "1000ml"
    base_price = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    order_items = relationship("OrderItem", back_populates="product")


class DesignTemplate(Base):
    __tablename__ = "design_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)  # hotel, restaurant, cafe, event, gym, corporate
    style = Column(String(100), nullable=True)  # modern, classic, minimal, luxury, eco
    file_path = Column(String(500), nullable=False)
    colors = Column(JSON, nullable=True)  # List of color codes
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class SavedDesign(Base):
    __tablename__ = "saved_designs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=True)
    canvas_json = Column(Text, nullable=True)  # Fabric.js JSON
    preview_url = Column(String(500), nullable=True)
    template_id = Column(Integer, ForeignKey("design_templates.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="saved_designs")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(50), default="pending")  # pending, confirmed, production, shipped, delivered, cancelled
    total_price = Column(Float, nullable=False)
    shipping_address = Column(Text, nullable=True)
    billing_address = Column(Text, nullable=True)
    payment_method = Column(String(50), nullable=True)
    payment_status = Column(String(50), default="pending")  # pending, paid, failed
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    design_json = Column(Text, nullable=True)
    design_preview_url = Column(String(500), nullable=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class Inquiry(Base):
    __tablename__ = "inquiries"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    business_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    quantity = Column(Integer, nullable=True)
    bottle_size = Column(String(50), nullable=True)
    requirements = Column(Text, nullable=True)
    status = Column(String(50), default="new")  # new, contacted, quoted, closed
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class OTP(Base):
    __tablename__ = "otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True, nullable=False)
    otp_code = Column(String(10), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)


class SiteConfig(Base):
    __tablename__ = "site_configs"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(Text, nullable=True)


class AdminUpload(Base):
    __tablename__ = "admin_uploads"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
