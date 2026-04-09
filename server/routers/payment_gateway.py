from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid
import logging

router = APIRouter(prefix="/payment", tags=["Payment Gateway"])
logger = logging.getLogger(__name__)

# ---- Request Schema ----
class CreateOrderRequest(BaseModel):
    amount: int
    plan_id: str


# ---- Dummy DB (replace later) ----
fake_orders_db = {}


# ---- Create Order Endpoint ----
@router.post("/create-order")
async def create_order(data: CreateOrderRequest):
    try:
        order_id = str(uuid.uuid4())

        order = {
            "order_id": order_id,
            "amount": data.amount,
            "plan_id": data.plan_id,
            "status": "created",
        }

        fake_orders_db[order_id] = order

        return {
            "success": True,
            "order_id": order_id,
            "amount": data.amount,
            "message": "Order created successfully",
        }

    except Exception as e:
        logger.error(f"Error creating order: {e}")
        raise HTTPException(status_code=500, detail="Something went wrong")


# ---- Verify Payment (dummy) ----
@router.post("/verify-payment")
async def verify_payment(order_id: str):
    if order_id not in fake_orders_db:
        raise HTTPException(status_code=404, detail="Order not found")

    fake_orders_db[order_id]["status"] = "paid"

    return {
        "success": True,
        "message": "Payment verified",
    }
