from fastapi import APIRouter

# Import the sliced sub-routers
from routers.admin_users import router as users_router
from routers.admin_metrics import router as metrics_router
from routers.admin_feedback import router as feedback_router
from routers.admin_broadcast import router as broadcast_router
from routers.admin_engagement import router as engagement_router
from routers.admin_bot import router as bot_router

# Create the Master Router with the /admin prefix
router = APIRouter(prefix="/admin", tags=["Admin Panel"])

# Stitch them all together seamlessly
router.include_router(users_router)
router.include_router(metrics_router)
router.include_router(feedback_router)
router.include_router(broadcast_router)
router.include_router(engagement_router)
router.include_router(bot_router)