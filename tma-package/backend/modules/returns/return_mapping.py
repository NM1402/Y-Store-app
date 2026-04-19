"""
O20.3: Return Management Engine - NP Status Mapping
Detects return scenarios from Nova Poshta tracking statuses
"""
from modules.returns.return_types import ReturnDetection


def detect_return_from_np(tr: dict) -> ReturnDetection:
    """
    Analyze NP tracking data and detect if it's a return scenario.
    Returns ReturnDetection with stage, reason, and confidence.
    """
    code = tr.get("status_code") or tr.get("StatusCode") or tr.get("np_status_code")
    text = (
        tr.get("status_text") or 
        tr.get("StatusText") or 
        tr.get("Status") or 
        tr.get("lastStatusText") or
        tr.get("np_status_text") or 
        ""
    ).lower()

    # ---- RETURNING stage detection ----
    # Returns in progress
    returning_keywords = [
        "повертається", "повернення", "повертається відправнику", 
        "повернення відправнику", "прямує до відправника", 
        "зворотна доставка", "зворотній напрямок"
    ]
    if any(k in text for k in returning_keywords):
        return ReturnDetection(
            is_return=True,
            stage="RETURNING",
            reason="RETURN_TO_SENDER",
            raw_status_code=int(code) if code is not None else None,
            raw_status_text=text,
            confidence=0.85,
            payload=tr
        )

    # Refused
    refused_keywords = ["відмова", "відмовився", "відмовилась", "відмовилися"]
    if any(k in text for k in refused_keywords):
        return ReturnDetection(
            is_return=True,
            stage="RETURNING",
            reason="REFUSED",
            raw_status_code=int(code) if code is not None else None,
            raw_status_text=text,
            confidence=0.8,
            payload=tr
        )

    # Not picked up
    not_picked_keywords = ["не забра", "не отриман", "неотриман"]
    if any(k in text for k in not_picked_keywords):
        return ReturnDetection(
            is_return=True,
            stage="RETURNING",
            reason="NOT_PICKED_UP",
            raw_status_code=int(code) if code is not None else None,
            raw_status_text=text,
            confidence=0.75,
            payload=tr
        )

    # Storage expired
    storage_keywords = ["термін зберігання", "строк зберігання", "закінчився термін"]
    if any(k in text for k in storage_keywords):
        return ReturnDetection(
            is_return=True,
            stage="RETURNING",
            reason="STORAGE_EXPIRED",
            raw_status_code=int(code) if code is not None else None,
            raw_status_text=text,
            confidence=0.75,
            payload=tr
        )

    # ---- RETURNED stage (delivered back to sender) ----
    returned_keywords = [
        "повернено відправнику", "повернення завершено", 
        "відправлення повернено", "доставлено відправнику",
        "отримано відправником"
    ]
    if any(k in text for k in returned_keywords):
        return ReturnDetection(
            is_return=True,
            stage="RETURNED",
            reason="RETURN_TO_SENDER",
            raw_status_code=int(code) if code is not None else None,
            raw_status_text=text,
            confidence=0.9,
            payload=tr
        )

    # Check NP status codes for common return scenarios
    # NP status codes: 102, 103, 108 = returning/returned
    if code is not None:
        try:
            code_int = int(code)
            if code_int in [102, 103]:  # Returning to sender
                return ReturnDetection(
                    is_return=True,
                    stage="RETURNING",
                    reason="RETURN_TO_SENDER",
                    raw_status_code=code_int,
                    raw_status_text=text,
                    confidence=0.85,
                    payload=tr
                )
            if code_int == 108:  # Returned
                return ReturnDetection(
                    is_return=True,
                    stage="RETURNED",
                    reason="RETURN_TO_SENDER",
                    raw_status_code=code_int,
                    raw_status_text=text,
                    confidence=0.9,
                    payload=tr
                )
        except (ValueError, TypeError):
            pass

    # No return detected
    return ReturnDetection(is_return=False, stage="NONE", reason="UNKNOWN", payload=tr)
