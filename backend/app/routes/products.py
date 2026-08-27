from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Product
from app.schemas import ProductResponse, PriceCalculateRequest, PriceCalculateResponse
from app.services.pricing import calculate_price

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("/", response_model=list[ProductResponse])
def list_products(db: Session = Depends(get_db)):
    """List all active products."""
    products = db.query(Product).filter(Product.is_active == True).all()
    return [ProductResponse.model_validate(p) for p in products]


@router.post("/calculate-price", response_model=PriceCalculateResponse)
def calc_price(data: PriceCalculateRequest, db: Session = Depends(get_db)):
    """Calculate price with bulk discounts."""
    result = calculate_price(db, data.bottle_size, data.quantity)
    return PriceCalculateResponse(**result)
