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

    # On-the-fly generation fallback: If no templates exist for this combo, generate 3 instantly!
    if not templates:
        try:
            from app.services.design_painter import generate_label_design, PALETTES
            palette_list = PALETTES.get(category, PALETTES["general"]).get(style, PALETTES["general"]["modern"])
            
            # Generate 3 variants on-the-fly and save to DB
            for v in range(min(3, len(palette_list))):
                path = generate_label_design(category, style, v)
                bg_hex, accent_hex, border_hex = palette_list[v % len(palette_list)]
                name = f"{category.title()} {style.title()} #{v + 1}"
                file_url = f"/static/generated/label_{category}_{style}_{v}.png"
                
                # Check for existing to avoid duplicates
                existing = db.query(DesignTemplate).filter_by(category=category, style=style, name=name).first()
                if not existing:
                    db.add(DesignTemplate(
                        name=name,
                        category=category,
                        style=style,
                        file_path=file_url,
                        colors=[bg_hex, accent_hex, border_hex]
                    ))
            db.commit()
            
            # Re-query
            templates = db.query(DesignTemplate).filter_by(category=category, style=style).all()
        except Exception as e:
            print(f"Error generating templates on-the-fly: {e}")

    # If still nothing, fallback to general category
    if not templates:
        templates = (
            db.query(DesignTemplate)
            .filter(DesignTemplate.category == "general")
            .limit(3)
            .all()
        )

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
def generate_template(
    data: TemplateSearchRequest,
    db: Session = Depends(get_db)
):
    """Generate or retrieve templates locally matching a category/vibe query."""
    query_lower = data.query.lower() if data.query else ""
    category = "general"
    if any(word in query_lower for word in ["hotel", "resort", "palace"]):
        category = "hotel"
    elif any(word in query_lower for word in ["restaurant", "food", "dine", "eat"]):
        category = "restaurant"
    elif any(word in query_lower for word in ["cafe", "coffee", "tea", "boba"]):
        category = "cafe"
    elif any(word in query_lower for word in ["event", "party", "wedding", "marriage"]):
        category = "event"
    elif any(word in query_lower for word in ["gym", "workout", "crossfit"]):
        category = "gym"
    elif any(word in query_lower for word in ["fitness", "yoga", "health"]):
        category = "fitness"
    elif any(word in query_lower for word in ["corporate", "business", "office"]):
        category = "corporate"

    # Query DB for category templates
    templates = db.query(DesignTemplate).filter(DesignTemplate.category == category).all()

    # On-the-fly fallback if templates for search category aren't in DB yet
    if not templates:
        try:
            from app.services.design_painter import generate_label_design, PALETTES
            style = "modern"
            palette_list = PALETTES.get(category, PALETTES["general"]).get(style, PALETTES["general"]["modern"])
            for v in range(min(3, len(palette_list))):
                generate_label_design(category, style, v)
                bg_hex, accent_hex, border_hex = palette_list[v % len(palette_list)]
                name = f"{category.title()} {style.title()} #{v + 1}"
                file_url = f"/static/generated/label_{category}_{style}_{v}.png"
                
                existing = db.query(DesignTemplate).filter_by(category=category, style=style, name=name).first()
                if not existing:
                    db.add(DesignTemplate(
                        name=name, category=category, style=style, file_path=file_url,
                        colors=[bg_hex, accent_hex, border_hex]
                    ))
            db.commit()
            templates = db.query(DesignTemplate).filter(DesignTemplate.category == category).all()
        except Exception as e:
            print(f"Error generating search template on-the-fly: {e}")

    designs = []
    for tpl in templates:
        designs.append(GeneratedDesign(
            id=f"tpl_{tpl.id}",
            name=f"{tpl.name} – {data.query.upper() if data.query else 'TEMPLATE'}",
            preview_url=tpl.file_path,
            base_image_url=tpl.file_path,
            style=tpl.style or "modern",
            colors=tpl.colors or ["#ffffff", "#000000"],
            template_id=tpl.id,
            business_name=data.query.upper() if data.query else "TEMPLATE",
            bottle_text=""
        ))

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
