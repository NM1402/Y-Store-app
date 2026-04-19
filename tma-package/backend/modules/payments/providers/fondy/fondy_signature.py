"""
Fondy Signature - SHA1 signature builder per Fondy docs
https://docs.fondy.eu/docs/page/3/
"""
import hashlib
from typing import Dict, Any


def build_signature(data: Dict[str, Any], password: str) -> str:
    """
    Build Fondy signature (SHA1).
    Algorithm: SHA1(password|param1|param2|...) where params sorted alphabetically.
    """
    # Filter out empty values and signature itself
    filtered = {
        k: v for k, v in data.items() 
        if v not in (None, "", []) and k != "signature"
    }
    
    # Sort keys alphabetically
    sorted_keys = sorted(filtered.keys())
    
    # Build signature string
    values = [str(filtered[k]) for k in sorted_keys]
    signature_str = password + "|" + "|".join(values)
    
    return hashlib.sha1(signature_str.encode("utf-8")).hexdigest()


def verify_signature(data: Dict[str, Any], password: str) -> bool:
    """
    Verify Fondy signature.
    Returns True if valid, raises exception if invalid.
    """
    received_signature = data.get("signature")
    if not received_signature:
        raise ValueError("MISSING_SIGNATURE")
    
    expected = build_signature(data, password)
    
    if received_signature != expected:
        raise ValueError("INVALID_SIGNATURE")
    
    return True
