from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Request
from typing import Any, Optional
from pydantic import BaseModel
from database import get_db
from security import require_admin
from cron_nudges import run_daily_nudges
from datetime import datetime
import logging
import os

router = APIRouter()
logger = logging.getLogger(__name__)

class SpecificNudgeRequest(BaseModel):
    nudge_type: str

class ToggleRulePayload(BaseModel):
    is_active: bool
    
class RulePayload(BaseModel):
    rule_name: str
    template_name: str
    description: str
    rule_type: str = "inactivity"
    hours_min: float = 0
    hours_max: float = 0
    bypass_limits: bool = False
    is_active: bool = True
    variables_required: str = ""
    schedule_time: Optional[str] = None
    schedule_day: Optional[str] = None

@router.get("/engagement/logs")
def get_nudge_logs(
    page: int = Query(1, ge=1), 
    limit: int = Query(20, ge=1), 
    sort_by: str = Query("sent_at"), 
    sort_order: str = Query("DESC"), 
    admin_id: int = Depends(require_admin)
):
    valid_sort = {
        "sent_at": "m.sent_at", 
        "user_name": "u.name", 
        "template_name": "m.template_name", 
        "trigger_reason": "m.trigger_reason"
    }
    db_sort = valid_sort.get(sort_by, "m.sent_at")
    order = "ASC" if sort_order.upper() == "ASC" else "DESC"

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        offset = (page - 1) * limit
        cursor.execute("SELECT COUNT(*) as count FROM automated_messages")
        total_records = cursor.fetchone()['count']
        
        query = f"""
            SELECT m.id, m.template_name, m.trigger_reason, m.sent_at, 
                   u.name as user_name, u.mobile
            FROM automated_messages m
            JOIN users u ON m.user_id = u.id
            ORDER BY {db_sort} {order}
            LIMIT %s OFFSET %s
        """
        cursor.execute(query, (limit, offset))
        return {"data": cursor.fetchall(), "total": total_records, "page": page, "limit": limit}
    except Exception as e:
        logger.error(f"Nudge Log Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/engagement/activity")
def get_user_activity_stats(
    page: int = Query(1, ge=1), 
    limit: int = Query(20, ge=1), 
    sort_by: str = Query("last_active_date"), 
    sort_order: str = Query("DESC"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    admin_id: int = Depends(require_admin)
):
    valid_sort = {
        "name": "name", 
        "total_transactions": "total_transactions", 
        "active_days": "active_days", 
        "streak": "streak",
        "days_since_joining": "days_since_joining", 
        "last_active_date": "last_active_date"
    }
    db_sort = valid_sort.get(sort_by, "last_active_date")
    order = "ASC" if sort_order.upper() == "ASC" else "DESC"

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        offset = (page - 1) * limit
        
        time_filter = ""
        params: list[Any] = []
        is_filtered = False
        
        if start_date:
            time_filter += " AND DATE(t.date) >= %s"
            params.append(start_date)
            is_filtered = True
        if end_date:
            time_filter += " AND DATE(t.date) <= %s"
            params.append(end_date)
            is_filtered = True
        
        if is_filtered:
            count_query = f"""
                SELECT COUNT(DISTINCT u.id) as count 
                FROM users u 
                JOIN transactions t ON u.id = t.user_id 
                WHERE 1=1 {time_filter}
            """
            cursor.execute(count_query, params)
            total_records = cursor.fetchone()['count']
            join_type = "INNER JOIN"
        else:
            count_query = "SELECT COUNT(id) as count FROM users"
            cursor.execute(count_query)
            total_records = cursor.fetchone()['count']
            join_type = "LEFT JOIN"
        
        query = f"""
            WITH FilteredTx AS (
                SELECT u.id as user_id, u.name, u.mobile, u.created_at, t.date
                FROM users u
                {join_type} transactions t ON u.id = t.user_id {time_filter}
            ),
            UserDates AS (
                SELECT user_id, DATE(date) as tx_date
                FROM FilteredTx
                WHERE date IS NOT NULL
                GROUP BY user_id, DATE(date)
            ),
            RankedDates AS (
                SELECT user_id, tx_date,
                       DENSE_RANK() OVER(PARTITION BY user_id ORDER BY tx_date) as rnk
                FROM UserDates
            ),
            GroupedStreaks AS (
                SELECT user_id,
                       DATE_SUB(tx_date, INTERVAL rnk DAY) as grp,
                       COUNT(*) as streak_len,
                       MAX(tx_date) as max_date
                FROM RankedDates
                GROUP BY user_id, DATE_SUB(tx_date, INTERVAL rnk DAY)
            ),
            MaxStreaks AS (
                SELECT g.user_id, g.streak_len
                FROM GroupedStreaks g
                INNER JOIN (
                    SELECT user_id, MAX(tx_date) as last_date
                    FROM UserDates
                    GROUP BY user_id
                ) m ON g.user_id = m.user_id AND g.max_date = m.last_date
            )
            SELECT 
                f.user_id,
                MAX(f.name) as name,
                MAX(f.mobile) as mobile,
                COUNT(f.date) as total_transactions,
                COUNT(DISTINCT DATE(f.date)) as active_days,
                COALESCE(MAX(f.date), MAX(f.created_at)) as last_active_date,
                DATEDIFF(NOW(), MAX(f.created_at)) as days_since_joining,
                COALESCE(MAX(s.streak_len), 0) as streak
            FROM FilteredTx f
            LEFT JOIN MaxStreaks s ON f.user_id = s.user_id
            GROUP BY f.user_id
            ORDER BY COUNT(f.date) = 0 ASC, {db_sort} {order}
            LIMIT %s OFFSET %s
        """
        
        cursor.execute(query, params + [limit, offset])
        return {"data": cursor.fetchall(), "total": total_records, "page": page, "limit": limit}
    except Exception as e:
        logger.error(f"Activity Stats Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/engagement/trigger-nudges")
async def trigger_automated_nudges(
    data: SpecificNudgeRequest, 
    background_tasks: BackgroundTasks, 
    admin_id: int = Depends(require_admin)
):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT role FROM users WHERE id = %s", (admin_id,))
        admin_data: Any = cursor.fetchone()
        if not isinstance(admin_data, dict) or admin_data.get('role') not in ['admin', 'superadmin']:
             raise HTTPException(status_code=403, detail="You do not have permission to trigger the nudge engine.")

        background_tasks.add_task(run_daily_nudges, data.nudge_type)
        return {
            "message": f"Nudge engine triggered for '{data.nudge_type}'",
            "status": "dispatched"
        }
    finally:
        conn.close()

@router.post("/engagement/flush-and-trigger")
async def flush_and_trigger_nudges(background_tasks: BackgroundTasks, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT role FROM users WHERE id = %s", (admin_id,))
        admin_data: Any = cursor.fetchone()
        if not isinstance(admin_data, dict) or admin_data.get('role') not in ['admin', 'superadmin']:
             raise HTTPException(status_code=403, detail="You do not have permission to flush logs.")

        cursor.execute("TRUNCATE TABLE automated_messages")
        conn.commit()

        background_tasks.add_task(run_daily_nudges, "all")
        return {"message": "Logs flushed and Nudge engine started fresh! Refresh in a few moments."}
    finally:
        conn.close()
        
@router.get("/engagement/cron-status")
def get_cron_status(request: Request, admin_id: int = Depends(require_admin)):
    scheduler = getattr(request.app.state, "scheduler", None)
    if not scheduler:
        return {"status": "offline", "next_run": None}
        
    job = scheduler.get_job('nudge_engine')
    if not job:
        return {"status": "not_found", "next_run": None}
        
    is_running = job.next_run_time is not None
    return {
        "status": "running" if is_running else "paused",
        "next_run": str(job.next_run_time) if job.next_run_time else "Paused"
    }
    
@router.post("/engagement/cron-toggle")
def toggle_cron_engine(request: Request, admin_id: int = Depends(require_admin)):
    scheduler = getattr(request.app.state, "scheduler", None)
    if not scheduler:
        raise HTTPException(status_code=500, detail="Scheduler not initialized")
        
    job = scheduler.get_job('nudge_engine')
    if not job:
        raise HTTPException(status_code=404, detail="Cron job not found")
        
    if job.next_run_time:
        scheduler.pause_job('nudge_engine')
        return {"message": "Engine paused successfully.", "status": "paused"}
    else:
        scheduler.resume_job('nudge_engine')
        return {"message": "Engine resumed successfully.", "status": "running"}

@router.get("/engagement/rules")
def get_nudge_rules(admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT ns.id, ns.rule_name, ns.template_name, ns.rule_type, 
                   ns.hours_min, ns.hours_max, ns.bypass_limits, 
                   ns.is_active, ns.description, ns.variables_required,
                   ns.schedule_time, ns.schedule_day,
                   COUNT(am.id) as `30d_sends`
            FROM nudge_settings ns
            LEFT JOIN automated_messages am ON ns.rule_name = am.trigger_reason AND am.sent_at >= NOW() - INTERVAL 30 DAY
            GROUP BY ns.id, ns.rule_name, ns.template_name, ns.rule_type, 
                     ns.hours_min, ns.hours_max, ns.bypass_limits, 
                     ns.is_active, ns.description, ns.variables_required,
                     ns.schedule_time, ns.schedule_day
            ORDER BY ns.id ASC
        """)
        return cursor.fetchall()
    finally:
        conn.close()

@router.put("/engagement/rules/{rule_name}")
def toggle_nudge_rule(rule_name: str, payload: ToggleRulePayload, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE nudge_settings SET is_active = %s WHERE rule_name = %s", (payload.is_active, rule_name))
        conn.commit()
        return {"message": f"Rule {rule_name} turned {'ON' if payload.is_active else 'OFF'}"}
    finally:
        conn.close()
        
@router.post("/engagement/rules")
def create_nudge_rule(payload: RulePayload, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO nudge_settings 
            (rule_name, template_name, description, rule_type, hours_min, hours_max, bypass_limits, is_active, variables_required, schedule_time, schedule_day)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (payload.rule_name, payload.template_name, payload.description, payload.rule_type, payload.hours_min, payload.hours_max, payload.bypass_limits, payload.is_active, payload.variables_required, payload.schedule_time, payload.schedule_day))
        conn.commit()
        return {"message": "Rule created successfully!"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Rule name must be unique or valid data provided.")
    finally:
        conn.close()

@router.put("/engagement/rules/edit/{rule_id}")
def edit_nudge_rule(rule_id: int, payload: RulePayload, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE nudge_settings 
            SET rule_name=%s, template_name=%s, description=%s, rule_type=%s, hours_min=%s, hours_max=%s, 
                bypass_limits=%s, is_active=%s, variables_required=%s, schedule_time=%s, schedule_day=%s
            WHERE id=%s
        """, (payload.rule_name, payload.template_name, payload.description, payload.rule_type, payload.hours_min, payload.hours_max, payload.bypass_limits, payload.is_active, payload.variables_required, payload.schedule_time, payload.schedule_day, rule_id))
        conn.commit()
        return {"message": "Rule updated successfully!"}
    finally:
        conn.close()

@router.delete("/engagement/rules/{rule_id}")
def delete_nudge_rule(rule_id: int, admin_id: int = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM nudge_settings WHERE id = %s", (rule_id,))
        conn.commit()
        return {"message": "Rule permanently deleted."}
    finally:
        conn.close()
        
@router.get("/engagement/debug-logs")
def get_nudge_debug_logs(admin_id: int = Depends(require_admin)):
    log_path = "logs/nudge_engine.log"
    if not os.path.exists(log_path):
        return {"logs": "No logs generated yet"}
    
    try:
        with open(log_path, "r") as f:
            lines = f.readlines()
            return {"logs": "".join(lines[-150:])}
    except Exception as e:
        return {"logs": f"Error reading logs: {str(e)}"}
    
@router.delete("/engagement/debug-logs")
def clear_nudge_debug_logs(admin_id: int = Depends(require_admin)):
    log_path = "logs/nudge_engine.log"
    try:
        with open(log_path, "w") as f:
            f.write(f"--- Log Cleared by Admin at {datetime.now()} ---\n")
        return {"message": "Logs cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))