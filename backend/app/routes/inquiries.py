from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Inquiry
from app.schemas import InquiryCreate, InquiryResponse
from app.services.email_service import send_inquiry_notification_email

router = APIRouter(prefix="/api/inquiries", tags=["inquiries"])


@router.post("/", response_model=InquiryResponse)
def create_inquiry(
    data: InquiryCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Submit a quote/inquiry request. No auth required."""
    inquiry = Inquiry(**data.model_dump())
    db.add(inquiry)
    db.commit()
    db.refresh(inquiry)

    # Send notification email to admins asynchronously
    try:
        background_tasks.add_task(send_inquiry_notification_email, inquiry)
    except Exception as e:
        print(f"[Inquiry Email Alert] Failed to schedule task: {e}")

    return InquiryResponse.model_validate(inquiry)
