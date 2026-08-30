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
    """Return pre-generated label designs matching the user's category + style."""
    category = (data.category or "general").lower()
    style    = (data.style or "modern").lower()

    # Query DB for matching templates
    templates = (
        db.query(DesignTemplate)
        .filter(
            DesignTemplate.category == category,
            DesignTemplate.style    == style,
        )
        .all()
    )

    # If nothing in DB yet (first boot worker still running), fallback to any category match
    if not templates:
        templates = (
            db.query(DesignTemplate)
            .filter(DesignTemplate.category == category)
            .limit(6)
            .all()
        )

    # Still nothing? Return a gentle empty response — worker will populate soon
    if not templates:
        return DesignGenerateResponse(designs=[], count=0)

    designs_out: list[GeneratedDesign] = []
    for tpl in templates:
        designs_out.append(GeneratedDesign(
            id=f"tpl_{tpl.id}",
            name=f"{tpl.name} – {data.business_name or 'YOUR BRAND'}",
            preview_url=tpl.file_path,
            base_image_url=tpl.file_path,
            style=tpl.style or style,
            colors=tpl.colors or ["#ffffff", "#000000"],
            template_id=tpl.id,
            business_name=data.business_name or "YOUR BRAND",
            bottle_text=data.bottle_text or "",
        ))

    return DesignGenerateResponse(designs=designs_out, count=len(designs_out))


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

    # Since we are prioritizing dynamically editable AI generations:
    from app.services.gemini_image_service import generate_ai_designs
    
    prompt = f"abstract {category} design"
    
    designs_data = generate_ai_designs(
        prompt=prompt,
        business_name=data.query.upper()[:15] if data.query else "TEMPLATE",
        count=data.count,
        detail="high",
        category=category,
        style="modern",
        enhance_prompt=False
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
