"""
design_worker.py — Daily design generation scheduler.
Runs at startup and every day at 2 AM to regenerate all label designs
with fresh daily color seeds, then upserts them in the DB.
"""

import os
import logging
from pathlib import Path
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import DesignTemplate
from app.services.design_painter import generate_all_designs

logger = logging.getLogger("design_worker")

STATIC_BASE_URL = "/static/generated"


def _file_path_to_url(file_path: str) -> str:
    """Convert absolute file path to a URL the frontend can fetch."""
    p = Path(file_path)
    return f"{STATIC_BASE_URL}/{p.name}"


def run_generation(variants_per_combo: int = 3):
    """Generate all designs and upsert into DB."""
    logger.info("[design_worker] Starting daily label design generation...")
    start = datetime.utcnow()

    results = generate_all_designs(variants_per_combo=variants_per_combo)

    db: Session = SessionLocal()
    try:
        inserted = 0
        updated = 0
        for r in results:
            url = _file_path_to_url(r["file_path"])
            name = f"{r['category'].title()} {r['style'].title()} #{r['variant'] + 1}"

            # Upsert: find by category + style + variant name
            existing = (
                db.query(DesignTemplate)
                .filter(
                    DesignTemplate.category == r["category"],
                    DesignTemplate.style == r["style"],
                    DesignTemplate.name == name,
                )
                .first()
            )
            if existing:
                existing.file_path = url
                existing.colors = r["colors"]
                updated += 1
            else:
                tpl = DesignTemplate(
                    name=name,
                    category=r["category"],
                    style=r["style"],
                    file_path=url,
                    colors=r["colors"],
                )
                db.add(tpl)
                inserted += 1

        db.commit()
        elapsed = (datetime.utcnow() - start).total_seconds()
        logger.info(
            f"[design_worker] Done in {elapsed:.1f}s — {inserted} inserted, {updated} updated"
        )
    except Exception as exc:
        db.rollback()
        logger.error(f"[design_worker] DB error: {exc}")
    finally:
        db.close()


# ── Singleton scheduler ──────────────────────────────────────────
_scheduler: BackgroundScheduler | None = None


def start_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        return

    _scheduler = BackgroundScheduler(timezone="Asia/Kolkata")

    # Run daily at 2:00 AM IST
    _scheduler.add_job(
        run_generation,
        trigger="cron",
        hour=2,
        minute=0,
        id="daily_design_gen",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info("[design_worker] Scheduler started — next run at 2:00 AM IST daily")

    # Trigger immediately on first startup (in a background thread)
    import threading
    t = threading.Thread(target=run_generation, daemon=True)
    t.start()


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
