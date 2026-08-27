from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Order, OrderItem, Product
from app.schemas import OrderCreate, OrderResponse, OrderItemResponse
from app.auth import get_current_user
from app.services.pricing import calculate_price
from app.services.email_service import send_order_notification_email

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("/", response_model=OrderResponse)
def create_order(
    data: OrderCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new order."""
    order = Order(
        user_id=current_user.id,
        total_price=0,
        shipping_address=data.shipping_address,
        billing_address=data.billing_address or data.shipping_address,
        payment_method=data.payment_method,
        notes=data.notes,
    )
    db.add(order)
    db.flush()

    total = 0
    items_details = []
    for item_data in data.items:
        product = db.query(Product).filter(Product.id == item_data.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item_data.product_id} not found")

        pricing = calculate_price(db, product.size, item_data.quantity)
        subtotal = pricing["total_price"]

        item = OrderItem(
            order_id=order.id,
            product_id=item_data.product_id,
            design_json=item_data.design_json,
            design_preview_url=item_data.design_preview_url,
            quantity=item_data.quantity,
            unit_price=pricing["unit_price"],
            subtotal=subtotal,
        )
        db.add(item)
        total += subtotal

        # Build items details for email notification
        items_details.append({
            "name": product.name,
            "size": product.size,
            "quantity": item_data.quantity,
            "unit_price": pricing["unit_price"],
            "subtotal": subtotal,
            "preview_url": item_data.design_preview_url
        })

    order.total_price = total
    db.commit()
    db.refresh(order)

    # Send notification email to admins asynchronously
    try:
        background_tasks.add_task(send_order_notification_email, order, current_user, items_details)
    except Exception as e:
        print(f"[Order Email Alert] Failed to schedule task: {e}")

    return OrderResponse.model_validate(order)


@router.get("/", response_model=list[OrderResponse])
def list_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all orders for the current user."""
    orders = (
        db.query(Order)
        .filter(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return [OrderResponse.model_validate(o) for o in orders]


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific order."""
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.user_id == current_user.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return OrderResponse.model_validate(order)
