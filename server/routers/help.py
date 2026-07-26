from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, Any
from database import get_db
from security import get_current_user
from utils import get_client_ip
import logging

router = APIRouter(prefix="/help", tags=["Help Center"])
logger = logging.getLogger(__name__)

class FeedbackSubmit(BaseModel):
    topic_id: int
    article_id: int
    is_helpful: bool
    user_id: Optional[int] = None

class TopicCreate(BaseModel):
    title: str
    description: str
    icon_name: str
    status: int = 1

class ArticleCreate(BaseModel):
    topic_id: int
    title: str
    content: str
    status: int = 1

@router.get("/topics")
def get_public_topics():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, title, description, icon_name, updated_at FROM help_topics WHERE status = 1 ORDER BY id ASC")
        topics = cursor.fetchall()
        
        cursor.execute("SELECT id, topic_id, title, content, updated_at FROM help_articles WHERE status = 1 ORDER BY id ASC")
        articles = cursor.fetchall()
        
        for topic in topics:
            topic['articles'] = [a for a in articles if a['topic_id'] == topic['id']]
            for a in topic['articles']:
                a['lastUpdated'] = a['updated_at'].strftime('%B %Y') if a.get('updated_at') else ""
                
        return topics
    except Exception as e:
        logger.error(f"Failed to fetch public help topics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        conn.close()

@router.post("/feedback")
def submit_feedback(data: FeedbackSubmit, request: Request):
    conn = get_db()
    cursor = conn.cursor()
    try:
        client_ip = get_client_ip(request)
        cursor.execute("""
            INSERT INTO help_feedback (topic_id, article_id, user_id, ip_address, is_helpful)
            VALUES (%s, %s, %s, %s, %s)
        """, (data.topic_id, data.article_id, data.user_id, client_ip, data.is_helpful))
        conn.commit()
        return {"message": "Feedback recorded successfully"}
    except Exception as e:
        conn.rollback()
        logger.error(f"Help Feedback Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/admin/topics")
def get_admin_topics(user_id: int = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM help_topics ORDER BY id DESC")
        topics = cursor.fetchall()
        cursor.execute("SELECT * FROM help_articles ORDER BY id DESC")
        articles = cursor.fetchall()
        
        for topic in topics:
            topic['articles'] = [a for a in articles if a['topic_id'] == topic['id']]
        return topics
    except Exception as e:
        logger.error(f"Failed to fetch admin help topics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        conn.close()

@router.post("/admin/topics")
def create_topic(data: TopicCreate, user_id: int = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO help_topics (title, description, icon_name, status) VALUES (%s, %s, %s, %s)",
            (data.title, data.description, data.icon_name, data.status)
        )
        conn.commit()
        return {"message": "Topic created"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/admin/topics/{topic_id}")
def update_topic(topic_id: int, data: TopicCreate, user_id: int = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE help_topics SET title=%s, description=%s, icon_name=%s, status=%s WHERE id=%s",
            (data.title, data.description, data.icon_name, data.status, topic_id)
        )
        conn.commit()
        return {"message": "Topic updated"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/admin/topics/{topic_id}")
def delete_topic(topic_id: int, user_id: int = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM help_topics WHERE id=%s", (topic_id,))
        conn.commit()
        return {"message": "Topic deleted"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/admin/articles")
def create_article(data: ArticleCreate, user_id: int = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO help_articles (topic_id, title, content, status) VALUES (%s, %s, %s, %s)",
            (data.topic_id, data.title, data.content, data.status)
        )
        conn.commit()
        return {"message": "Article created"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/admin/articles/{article_id}")
def update_article(article_id: int, data: ArticleCreate, user_id: int = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE help_articles SET title=%s, content=%s, status=%s WHERE id=%s",
            (data.title, data.content, data.status, article_id)
        )
        conn.commit()
        return {"message": "Article updated"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/admin/articles/{article_id}")
def delete_article(article_id: int, user_id: int = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM help_articles WHERE id=%s", (article_id,))
        conn.commit()
        return {"message": "Article deleted"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
        
@router.get("/admin/feedback")
def get_help_feedback_analytics(user_id: int = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT 
                f.id,
                f.is_helpful,
                f.ip_address,
                f.created_at as date_updated,
                f.user_id,
                u.name as user_name,
                t.title as topic_title,
                a.title as article_title
            FROM help_feedback f
            LEFT JOIN users u ON f.user_id = u.id
            LEFT JOIN help_topics t ON f.topic_id = t.id
            LEFT JOIN help_articles a ON f.article_id = a.id
            ORDER BY f.created_at DESC
        """)
        return cursor.fetchall()
    except Exception as e:
        logger.error(f"Failed to fetch feedback analytics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        conn.close()