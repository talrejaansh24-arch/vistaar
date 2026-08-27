from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import SiteConfig, User
from app.auth import get_current_admin
from pydantic import BaseModel
from typing import Dict

router = APIRouter(prefix="/api/config", tags=["config"])


class ConfigUpdatePayload(BaseModel):
    configs: Dict[str, str]


@router.get("")
def get_site_configs(db: Session = Depends(get_db)):
    """Fetch all dynamic site configurations."""
    records = db.query(SiteConfig).all()
    # Convert list of models to key-value dictionary
    return {r.key: r.value for r in records}


@router.post("/admin")
def update_site_configs(
    payload: ConfigUpdatePayload,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Batch update site configurations (admin only)."""
    for k, v in payload.configs.items():
        record = db.query(SiteConfig).filter(SiteConfig.key == k).first()
        if record:
            record.value = v
        else:
            db.add(SiteConfig(key=k, value=v))
            
    db.commit()
    return {"message": "Configurations updated successfully"}
