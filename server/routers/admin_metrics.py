from fastapi import APIRouter, Depends, HTTPException
from typing import Any, Optional
from database import get_db
from security import require_admin
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/metrics")
def get_system_metrics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    admin_id: int = Depends(require_admin)
):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        time_filter = "created_at >= NOW() - INTERVAL 24 HOUR"
        params: list[Any] = []
        
        if start_date and end_date:
            time_filter = "DATE(created_at) >= %s AND DATE(created_at) <= %s"
            params = [start_date, end_date]
        elif start_date:
            time_filter = "DATE(created_at) >= %s"
            params = [start_date]

        cursor.execute(f"""
            SELECT method, endpoint, COUNT(*) as total_calls, ROUND(AVG(response_time_ms), 2) as avg_time_ms
            FROM api_metrics 
            WHERE {time_filter} AND status_code = 200
            GROUP BY method, endpoint 
            ORDER BY avg_time_ms DESC LIMIT 10
        """, params)
        slowest: list[Any] = cursor.fetchall()

        cursor.execute(f"""
            SELECT method, endpoint, COUNT(*) as total_calls, ROUND(AVG(response_time_ms), 2) as avg_time_ms
            FROM api_metrics 
            WHERE {time_filter}
            GROUP BY method, endpoint 
            ORDER BY total_calls DESC LIMIT 10
        """, params)
        most_used: list[Any] = cursor.fetchall()

        cursor.execute(f"""
            SELECT method, endpoint, status_code, COUNT(*) as error_count
            FROM api_metrics 
            WHERE {time_filter} AND status_code >= 400
            GROUP BY method, endpoint, status_code 
            ORDER BY error_count DESC LIMIT 10
        """, params)
        errors: list[Any] = cursor.fetchall()

        cursor.execute(f"""
            SELECT COUNT(*) as total_requests, ROUND(AVG(response_time_ms), 2) as global_avg_ms
            FROM api_metrics 
            WHERE {time_filter}
        """, params)
        pulse_raw: Any = cursor.fetchone()
        pulse: dict[str, Any] = pulse_raw if isinstance(pulse_raw, dict) else {"total_requests": 0, "global_avg_ms": 0}

        return {
            "slowest": slowest, 
            "most_used": most_used, 
            "errors": errors,
            "pulse": {
                "total_requests": pulse.get("total_requests") or 0, 
                "average_time": pulse.get("global_avg_ms") or 0
            }
        }
    except Exception as e:
        logger.error(f"Metrics Error: {e}")
        return {"slowest": [], "most_used": [], "errors": [], "pulse": {"total_requests": 0, "average_time": 0}}
    finally:
        conn.close()

@router.delete("/metrics")
def truncate_metrics(start_date: str, end_date: str, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM api_metrics WHERE DATE(created_at) >= %s AND DATE(created_at) <= %s", (start_date, end_date))
        deleted_count = cursor.rowcount
        conn.commit()
        return {"message": f"Successfully deleted {deleted_count} records."}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()