from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, SavedDesign, DesignTemplate
from app.schemas import (
    DesignGenerateRequest, DesignGenerateResponse, GeneratedDesign,
    SaveDesignRequest, SavedDesignResponse, AIDesignGenerateRequest,
)
from app.auth import get_current_user
from app.services.design_engine import generate_designs
from app.services.gemini_image_service import generate_ai_designs
from pydantic import BaseModel

class TemplateSearchRequest(BaseModel):
    query: str
    count: int = 4

router = APIRouter(prefix="/api/designs", tags=["designs"])


@router.post("/generate", response_model=DesignGenerateResponse)
def generate(
    data: DesignGenerateRequest,
    db: Session = Depends(get_db),
):
    """Generate design mockups based on user input. No auth required."""
    # 1. Fetch custom uploaded templates from database
    db_designs = []
    try:
        # Filter by style or category if provided
        query = db.query(DesignTemplate)
        if data.style:
            query = query.filter(DesignTemplate.style == data.style.lower())
        elif data.category:
            query = query.filter(DesignTemplate.category == data.category.lower())
        
        db_templates = query.all()
        for t in db_templates:
            db_designs.append(GeneratedDesign(
                id=f"db_{t.id}",
                name=t.name,
                preview_url=t.file_path,
                style=t.style or "modern",
                colors=t.colors or ["#ffffff", "#000000"],
                template_id=t.id,
                business_name=data.business_name,
                bottle_text=data.bottle_text
            ))
    except Exception as e:
        print(f"[Generate] Database templates load warning: {e}")

    # 2. Generate procedural designs
    designs_data = generate_designs(
        business_name=data.business_name,
        bottle_text=data.bottle_text,
        category=data.category,
        bottle_size=data.bottle_size,
        style=data.style,
    )
    procedural_designs = [GeneratedDesign(**d) for d in designs_data]

    # Combine: put database templates first, then fill up with procedural ones
    all_combined = db_designs + procedural_designs
    return DesignGenerateResponse(designs=all_combined, count=len(all_combined))


@router.post("/generate-ai", response_model=DesignGenerateResponse)
def generate_ai(data: AIDesignGenerateRequest):
    """Generate designs using Gemini image generation."""
    try:
        designs_data = generate_ai_designs(
            prompt=data.prompt,
            business_name=data.business_name or "VISTAARWATER",
            count=data.count or 3,
            detail=data.detail_level or "medium",
            category=data.category or "general",
            style=data.style or "modern",
            enhance_prompt=data.enhance_prompt if data.enhance_prompt is not None else True,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    designs = [GeneratedDesign(**d) for d in designs_data]
    return DesignGenerateResponse(designs=designs, count=len(designs))


@router.post("/generate-template", response_model=DesignGenerateResponse)
def generate_template(data: TemplateSearchRequest):
    """Generate design mockups as templates based on a search query."""
    # Map search query to a category or just use it as the business name for now
    # to simulate an AI generating a template for that specific vibe.
    category = "general"
    query_lower = data.query.lower()
    if any(word in query_lower for word in ["hotel", "resort"]):
        category = "hotel"
    elif any(word in query_lower for word in ["restaurant", "food", "dine"]):
        category = "restaurant"
    elif any(word in query_lower for word in ["cafe", "coffee"]):
        category = "cafe"
    elif any(word in query_lower for word in ["event", "party", "wedding"]):
        category = "event"
    elif any(word in query_lower for word in ["gym", "fitness", "sport"]):
        category = "gym"
    elif any(word in query_lower for word in ["corporate", "business"]):
        category = "corporate"

    designs_data = generate_designs(
        business_name=data.query.upper()[:15] if data.query else "TEMPLATE",
        bottle_text="Premium Quality",
        category=category,
        bottle_size="500ml",
        style="modern",
        count=data.count,
    )

    designs = [GeneratedDesign(**d) for d in designs_data]
    return DesignGenerateResponse(designs=designs, count=len(designs))


@router.post("/save", response_model=SavedDesignResponse)
def save_design(
    data: SaveDesignRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a design to the user's library."""
    design = SavedDesign(
        user_id=current_user.id,
        name=data.name,
        canvas_json=data.canvas_json,
        preview_url=data.preview_url,
        template_id=data.template_id,
    )
    db.add(design)
    db.commit()
    db.refresh(design)
    return SavedDesignResponse.model_validate(design)


@router.get("/", response_model=list[SavedDesignResponse])
def list_saved_designs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all saved designs for the current user."""
    designs = (
        db.query(SavedDesign)
        .filter(SavedDesign.user_id == current_user.id)
        .order_by(SavedDesign.created_at.desc())
        .all()
    )
    return [SavedDesignResponse.model_validate(d) for d in designs]


@router.get("/{design_id}", response_model=SavedDesignResponse)
def get_saved_design(
    design_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific saved design."""
    design = (
        db.query(SavedDesign)
        .filter(SavedDesign.id == design_id, SavedDesign.user_id == current_user.id)
        .first()
    )
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    return SavedDesignResponse.model_validate(design)


@router.delete("/{design_id}")
def delete_saved_design(
    design_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a saved design."""
    design = (
        db.query(SavedDesign)
        .filter(SavedDesign.id == design_id, SavedDesign.user_id == current_user.id)
        .first()
    )
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    db.delete(design)
    db.commit()
    return {"message": "Design deleted successfully"}
