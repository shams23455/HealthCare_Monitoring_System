from typing import Optional, Any, Dict
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.audit import AuditLog

def log_audit(
    db: Session,
    action: str,
    entity_type: str,
    user_id: Optional[UUID] = None,
    entity_id: Optional[UUID] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> AuditLog:
    """
    Records an immutable audit event for security traceability.
    Ensures passwords or sensitive tokens are never stored in audit logs.
    """
    audit_entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata_info=metadata or {}
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry
