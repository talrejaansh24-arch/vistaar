import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import STATIC_DIR

app = FastAPI(
    title="VistaarWater API",
    description="B2B Custom Water Bottle Design & Ordering Platform",
    version="1.0.0",
)

# CORS — allow all origins since frontend is served from the same domain in production
# In local dev the proxy handles this, so this is safe.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Backend /static (uploaded images, generated designs, product images)
try:
    if Path(str(STATIC_DIR)).exists():
        app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
except Exception as e:
    print(f"Warning: Could not mount /static: {e}")

# Include routes
from app.routes import auth, designs, orders, products, inquiries, admin, config
app.include_router(auth.router)
app.include_router(designs.router)
app.include_router(orders.router)
app.include_router(products.router)
app.include_router(inquiries.router)
app.include_router(admin.router)
app.include_router(config.router)


# ── Serve React frontend dist ──
# In Docker (production): Dockerfile copies frontend/dist → /app/frontend_dist
# In local dev:           frontend/dist is at ../../frontend/dist relative to this file
_APP_DIR = Path(__file__).parent.parent  # /app in Docker, vistaar/backend in dev
_FRONTEND_DIST = (
    _APP_DIR / "frontend_dist"           # Docker production path
    if (_APP_DIR / "frontend_dist").exists()
    else _APP_DIR.parent / "frontend" / "dist"  # Local dev path
)

if _FRONTEND_DIST.exists():
    # Mount /assets (Vite JS/CSS bundles)
    _assets_dir = _FRONTEND_DIST / "assets"
    if _assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="frontend-assets")
    # Mount root-level public files: logo.png, favicon.svg, icons.svg etc.
    # These are files Vite copies from /public directly into dist/
    app.mount("/public-files", StaticFiles(directory=str(_FRONTEND_DIST)), name="frontend-root-files")
    print(f"[startup] Serving React frontend from: {_FRONTEND_DIST}")
else:
    print(f"[startup] WARNING: Frontend dist not found at {_FRONTEND_DIST}. Run build first.")


@app.get("/")
def root():
    """Serve React index.html at root, or fall back to API status."""
    index_file = _FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"message": "VistaarWater API is running", "version": "1.0.0"}


@app.get("/api/health")
def health():
    return {"status": "healthy"}


@app.get("/api/debug/email")
def debug_email():
    """Test endpoint — sends a test OTP email to the configured SMTP_USER address."""
    from app.config import SMTP_USER, SMTP_PASSWORD, SENDER_EMAIL, SMTP_HOST
    from app.services.email_service import send_otp_email
    result = send_otp_email(SMTP_USER, "999999")
    return {
        "email_sent": result,
        "smtp_host": SMTP_HOST,
        "smtp_user": SMTP_USER,
        "sender": SENDER_EMAIL,
        "smtp_password_set": bool(SMTP_PASSWORD and SMTP_PASSWORD != "your-app-password-here"),
    }


@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    """
    Catch-all: serves files from frontend_dist if they exist,
    otherwise serves index.html for React Router (SPA fallback).
    """
    # Never intercept API or backend static routes
    if full_path.startswith(("api/", "static/", "assets/")):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Not found")

    # Check if a real file exists in dist (logo.png, favicon.svg, icons.svg, etc.)
    requested_file = _FRONTEND_DIST / full_path
    if requested_file.exists() and requested_file.is_file():
        return FileResponse(str(requested_file))

    # Fallback — serve index.html for all React routes (HashRouter)
    index_file = _FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))

    return {"message": "Frontend not built. Run build first."}


@app.get("/api/debug")
def debug():
    """Debug endpoint – shows DB connectivity status."""
    import os
    from app.config import DATABASE_URL
    db_type = "sqlite" if "sqlite" in DATABASE_URL else "postgres"
    db_status = "unknown"
    db_error = None
    try:
        from sqlalchemy import text
        from app.database import engine
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = "error"
        db_error = str(e)
    return {
        "db_type": db_type,
        "db_status": db_status,
        "db_error": db_error,
        "has_postgres_url": bool(os.getenv("POSTGRES_URL")),
        "has_pghost": bool(os.getenv("PGHOST")),
    }


@app.on_event("startup")
async def startup_event():
    """
    Run DB setup on startup. Uses async event so any failure here
    does NOT crash the module import and won't cause 500s on all routes.
    """
    try:
        from app.database import engine, Base
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[startup] Error creating tables: {e}")
        return

    # Migration: add is_suspended, session_version, and is_logged_in columns if missing
    try:
        from sqlalchemy import text
        from app.database import engine
        with engine.connect() as conn:
            # 1. Alter is_suspended
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_suspended BOOLEAN DEFAULT FALSE"))
                conn.commit()
            except Exception:
                pass  # Already exists or unsupported
                
            # 2. Alter session_version
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN session_version INTEGER DEFAULT 1"))
                conn.commit()
            except Exception:
                pass  # Already exists or unsupported
                
            # 3. Alter is_logged_in
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_logged_in BOOLEAN DEFAULT FALSE"))
                conn.commit()
            except Exception:
                pass  # Already exists or unsupported
    except Exception as migration_err:
        print(f"[Migration Warning] Database column verification failed: {migration_err}")

        # Auto-seed default data
    try:
        from app.models import Product, User, SiteConfig, AdminUpload
        from app.auth import hash_password
        from app.database import SessionLocal
        db = SessionLocal()

        if db.query(Product).count() == 0:
            db.add_all([
                Product(name="VistaarWater Classic 250ml", size="250ml", base_price=15.0,
                        description="Compact 250ml bottle, perfect for events and meetings.", image_url="/static/products/250ml.png"),
                Product(name="VistaarWater Standard 500ml", size="500ml", base_price=20.0,
                        description="Our most popular 500ml bottle for hotels, restaurants, and offices.", image_url="/static/products/500ml.png"),
                Product(name="VistaarWater Premium 1000ml", size="1000ml", base_price=30.0,
                        description="Large 1000ml bottle for gyms, events, and premium hospitality.", image_url="/static/products/1000ml.png"),
            ])
            print("Auto-seeded default products.")

        admin_email = "admin@vistaarwater.com"
        if db.query(User).filter(User.email == admin_email).count() == 0:
            db.add(User(
                email=admin_email,
                password_hash=hash_password("admin123"),
                business_name="VistaarWater Admin",
                role="admin",
            ))
            print(f"Auto-seeded admin user: {admin_email}")

        demo_email = "demo@vistaarwater.com"
        if db.query(User).filter(User.email == demo_email).count() == 0:
            db.add(User(
                email=demo_email,
                password_hash=hash_password("demo123"),
                business_name="Royal Hotel",
                phone="+91 9876543210",
                role="user",
            ))
            print(f"Auto-seeded demo user: {demo_email}")

        # Seed site configurations
        if db.query(SiteConfig).count() == 0:
            default_configs = {
                "hero_title": "Design Your Branded Custom Water Bottles",
                "hero_subtitle": "Elevate your brand with premium customized packaging. Instantly view interactive designs, place bulk orders with volume discounts, and get delivered across India.",
                "hero_cta_text": "Start Designing Now",
                "trusted_label": "Trusted by leading businesses across India",
                "how_it_works_title": "How It Works",
                "how_it_works_subtitle": "Four simple steps to get your branded bottles",
                "features_title": "Why VistaarWater?",
                "features_subtitle": "Everything you need for professional branded water bottles",
                "cta_title": "Ready to Brand Your Bottles?",
                "cta_subtitle": "Join 500+ businesses who trust VistaarWater for their custom water bottles",
            }
            for k, v in default_configs.items():
                db.add(SiteConfig(key=k, value=v))
            print("Auto-seeded default site configurations.")

        # Seed dynamic pricing configurations if missing
        pricing_keys = {
            "price_250ml": "15",
            "price_500ml": "20",
            "price_1000ml": "30",
            "discount_500": "5",
            "discount_1000": "10",
            "discount_2000": "15"
        }
        for k, v in pricing_keys.items():
            if db.query(SiteConfig).filter(SiteConfig.key == k).count() == 0:
                db.add(SiteConfig(key=k, value=v))
                print(f"Auto-seeded default pricing key: {k} = {v}")

        # Seed Design Templates
        from app.models import DesignTemplate
        if db.query(DesignTemplate).count() == 0:
            templates_to_seed = [
                # Hotel category
                {"name": "Santi Weihermann Elegant", "category": "hotel", "file_path": "/static/templates/hotel_1.png", "style": "luxury", "colors": ["#dcd3be", "#563624"]},
                {"name": "Dra. Patricia Ruby Minimal", "category": "hotel", "file_path": "/static/templates/hotel_2.png", "style": "minimal", "colors": ["#800918", "#ffffff"]},
                {"name": "Verdant O Shield", "category": "hotel", "file_path": "/static/templates/hotel_3.png", "style": "luxury", "colors": ["#fdfdfd", "#083c27"]},
                {"name": "Private Water Deep Blue", "category": "hotel", "file_path": "/static/templates/hotel_4.png", "style": "premium", "colors": ["#042d5f", "#ffffff"]},
                {"name": "Veridian Naturals Eco", "category": "hotel", "file_path": "/static/templates/hotel_5.png", "style": "eco", "colors": ["#7f8e79", "#ffffff"]},

                # Restaurant category
                {"name": "Dra. Patricia Ruby Minimal", "category": "restaurant", "file_path": "/static/templates/hotel_2.png", "style": "minimal", "colors": ["#800918", "#ffffff"]},
                {"name": "Verdant O Shield", "category": "restaurant", "file_path": "/static/templates/hotel_3.png", "style": "luxury", "colors": ["#fdfdfd", "#083c27"]},
                {"name": "Santi Weihermann Elegant", "category": "restaurant", "file_path": "/static/templates/hotel_1.png", "style": "luxury", "colors": ["#dcd3be", "#563624"]},
                {"name": "Veridian Naturals Eco", "category": "restaurant", "file_path": "/static/templates/hotel_5.png", "style": "eco", "colors": ["#7f8e79", "#ffffff"]},
                {"name": "Private Water Deep Blue", "category": "restaurant", "file_path": "/static/templates/hotel_4.png", "style": "premium", "colors": ["#042d5f", "#ffffff"]},

                # Cafe category
                {"name": "Santi Weihermann Elegant", "category": "cafe", "file_path": "/static/templates/hotel_1.png", "style": "luxury", "colors": ["#dcd3be", "#563624"]},
                {"name": "Dra. Patricia Ruby Minimal", "category": "cafe", "file_path": "/static/templates/hotel_2.png", "style": "minimal", "colors": ["#800918", "#ffffff"]},
                {"name": "Veridian Naturals Eco", "category": "cafe", "file_path": "/static/templates/hotel_5.png", "style": "eco", "colors": ["#7f8e79", "#ffffff"]},
                {"name": "Verdant O Shield", "category": "cafe", "file_path": "/static/templates/hotel_3.png", "style": "luxury", "colors": ["#fdfdfd", "#083c27"]},
                {"name": "Private Water Deep Blue", "category": "cafe", "file_path": "/static/templates/hotel_4.png", "style": "premium", "colors": ["#042d5f", "#ffffff"]},

                # Event category
                {"name": "Dra. Patricia Ruby Minimal", "category": "event", "file_path": "/static/templates/hotel_2.png", "style": "minimal", "colors": ["#800918", "#ffffff"]},
                {"name": "Private Water Deep Blue", "category": "event", "file_path": "/static/templates/hotel_4.png", "style": "premium", "colors": ["#042d5f", "#ffffff"]},
                {"name": "Santi Weihermann Elegant", "category": "event", "file_path": "/static/templates/hotel_1.png", "style": "luxury", "colors": ["#dcd3be", "#563624"]},
                {"name": "Verdant O Shield", "category": "event", "file_path": "/static/templates/hotel_3.png", "style": "luxury", "colors": ["#fdfdfd", "#083c27"]},
                {"name": "Veridian Naturals Eco", "category": "event", "file_path": "/static/templates/hotel_5.png", "style": "eco", "colors": ["#7f8e79", "#ffffff"]},

                # Gym category
                {"name": "Veridian Naturals Eco", "category": "gym", "file_path": "/static/templates/hotel_5.png", "style": "eco", "colors": ["#7f8e79", "#ffffff"]},
                {"name": "Dra. Patricia Ruby Minimal", "category": "gym", "file_path": "/static/templates/hotel_2.png", "style": "minimal", "colors": ["#800918", "#ffffff"]},
                {"name": "Private Water Deep Blue", "category": "gym", "file_path": "/static/templates/hotel_4.png", "style": "premium", "colors": ["#042d5f", "#ffffff"]},
                {"name": "Verdant O Shield", "category": "gym", "file_path": "/static/templates/hotel_3.png", "style": "luxury", "colors": ["#fdfdfd", "#083c27"]},
                {"name": "Santi Weihermann Elegant", "category": "gym", "file_path": "/static/templates/hotel_1.png", "style": "luxury", "colors": ["#dcd3be", "#563624"]},

                # Corporate category
                {"name": "Private Water Deep Blue", "category": "corporate", "file_path": "/static/templates/hotel_4.png", "style": "premium", "colors": ["#042d5f", "#ffffff"]},
                {"name": "Verdant O Shield", "category": "corporate", "file_path": "/static/templates/hotel_3.png", "style": "luxury", "colors": ["#fdfdfd", "#083c27"]},
                {"name": "Santi Weihermann Elegant", "category": "corporate", "file_path": "/static/templates/hotel_1.png", "style": "luxury", "colors": ["#dcd3be", "#563624"]},
                {"name": "Veridian Naturals Eco", "category": "corporate", "file_path": "/static/templates/hotel_5.png", "style": "eco", "colors": ["#7f8e79", "#ffffff"]},
                {"name": "Dra. Patricia Ruby Minimal", "category": "corporate", "file_path": "/static/templates/hotel_2.png", "style": "minimal", "colors": ["#800918", "#ffffff"]},

                # General category
                {"name": "Veridian Naturals Eco", "category": "general", "file_path": "/static/templates/hotel_5.png", "style": "eco", "colors": ["#7f8e79", "#ffffff"]},
                {"name": "Santi Weihermann Elegant", "category": "general", "file_path": "/static/templates/hotel_1.png", "style": "luxury", "colors": ["#dcd3be", "#563624"]},
                {"name": "Private Water Deep Blue", "category": "general", "file_path": "/static/templates/hotel_4.png", "style": "premium", "colors": ["#042d5f", "#ffffff"]},
                {"name": "Verdant O Shield", "category": "general", "file_path": "/static/templates/hotel_3.png", "style": "luxury", "colors": ["#fdfdfd", "#083c27"]},
                {"name": "Dra. Patricia Ruby Minimal", "category": "general", "file_path": "/static/templates/hotel_2.png", "style": "minimal", "colors": ["#800918", "#ffffff"]},
            ]
            for t in templates_to_seed:
                db.add(DesignTemplate(**t))
            print("Auto-seeded default category design templates.")

        db.commit()
        db.close()
    except Exception as e:
        print(f"[startup] Error during auto-seeding: {e}")
