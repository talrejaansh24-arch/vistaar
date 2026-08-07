import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import FRONTEND_URL, FRONTEND_URLS, STATIC_DIR

app = FastAPI(
    title="VistaarWater API",
    description="B2B Custom Water Bottle Design & Ordering Platform",
    version="1.0.0",
)

allowed_origins = list(dict.fromkeys([FRONTEND_URL, *FRONTEND_URLS]))

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files (skip gracefully if missing)
try:
    from pathlib import Path
    if Path(str(STATIC_DIR)).exists():
        app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
except Exception as e:
    print(f"Warning: Could not mount static files: {e}")

# Include routes
from app.routes import auth, designs, orders, products, inquiries, admin
app.include_router(auth.router)
app.include_router(designs.router)
app.include_router(orders.router)
app.include_router(products.router)
app.include_router(inquiries.router)
app.include_router(admin.router)


# ── Serve React frontend dist ──
# The frontend is built to frontend/dist by build.sh.
# We mount it so FastAPI serves the React app on the same domain.
_FRONTEND_DIST = Path(__file__).parent.parent.parent / "frontend" / "dist"

if _FRONTEND_DIST.exists():
    # Serve static assets (JS, CSS, images) under /assets
    app.mount("/assets", StaticFiles(directory=str(_FRONTEND_DIST / "assets")), name="frontend-assets")
    print(f"[startup] Serving React frontend from: {_FRONTEND_DIST}")
else:
    print(f"[startup] WARNING: Frontend dist not found at {_FRONTEND_DIST}. Run build.sh first.")


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


@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    """
    Catch-all route: serves the React index.html for any non-API path.
    This makes React Router (HashRouter) work perfectly on a single domain.
    The path must not start with 'api', 'static', or 'assets' (those are
    handled by FastAPI routes / StaticFiles mounts above).
    """
    # Don't intercept API or static file paths
    if full_path.startswith(("api/", "static/", "assets/")):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Not found")

    index_file = _FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"message": "Frontend not built. Run build.sh to generate dist."}


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

    # Migration: add is_suspended column if missing
    try:
        from sqlalchemy import text
        from app.database import engine
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE"))
            conn.commit()
    except Exception:
        pass  # Column already exists or DB doesn't support ALTER TABLE IF NOT EXISTS

    # Auto-seed default data
    try:
        from app.models import Product, User
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

        db.commit()
        db.close()
    except Exception as e:
        print(f"[startup] Error during auto-seeding: {e}")
