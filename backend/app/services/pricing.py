from sqlalchemy.orm import Session
from app.models import SiteConfig

def get_pricing_configs(db: Session) -> dict:
    """Helper to fetch dynamic pricing configurations from database."""
    default_vals = {
        "price_250ml": 15.0,
        "price_500ml": 20.0,
        "price_1000ml": 30.0,
        "discount_500": 0.05,
        "discount_1000": 0.10,
        "discount_2000": 0.15
    }
    
    try:
        configs = db.query(SiteConfig).filter(SiteConfig.key.in_(default_vals.keys())).all()
        for c in configs:
            if c.value is not None:
                val = float(c.value)
                if "discount" in c.key:
                    default_vals[c.key] = val / 100.0
                else:
                    default_vals[c.key] = val
    except Exception as e:
        print(f"[Pricing Service] Error loading dynamic prices: {e}")
        
    return default_vals


def calculate_price(db: Session, bottle_size: str, quantity: int) -> dict:
    """Calculate total price with bulk discount dynamically loaded from database."""
    configs = get_pricing_configs(db)
    
    base_price = configs.get(f"price_{bottle_size}", 20.0)
    
    discount = 0.0
    if quantity >= 2000:
        discount = configs.get("discount_2000", 0.15)
    elif quantity >= 1000:
        discount = configs.get("discount_1000", 0.10)
    elif quantity >= 500:
        discount = configs.get("discount_500", 0.05)
        
    unit_price = round(base_price * (1 - discount), 2)
    total_price = round(unit_price * quantity, 2)

    return {
        "bottle_size": bottle_size,
        "quantity": quantity,
        "base_price": base_price,
        "discount_percent": discount * 100,
        "unit_price": unit_price,
        "total_price": total_price,
    }
