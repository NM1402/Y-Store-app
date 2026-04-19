"""
WayForPay Signature Utils - HMAC_MD5 signature generation/verification
https://wiki.wayforpay.com/view/852102
"""
import hashlib
import hmac
from typing import Dict, Any, List


def build_signature(data: Dict[str, Any], secret_key: str, fields: List[str] = None) -> str:
    """
    Build HMAC_MD5 signature for WayForPay request.
    
    For Purchase request: merchantAccount;merchantDomainName;orderReference;orderDate;amount;currency;
                         productName[0];...;productCount[0];...;productPrice[0];...
    
    For Response verification: merchantAccount;orderReference;amount;currency;authCode;cardPan;
                              transactionStatus;reasonCode
    """
    if fields is None:
        # Default fields for Purchase request
        fields = [
            "merchantAccount", "merchantDomainName", "orderReference", "orderDate",
            "amount", "currency"
        ]
        
        # Add product arrays
        product_names = data.get("productName", [])
        product_counts = data.get("productCount", [])
        product_prices = data.get("productPrice", [])
        
        values = []
        for field in fields:
            val = data.get(field, "")
            values.append(str(val) if val else "")
        
        # Add product arrays
        for name in product_names:
            values.append(str(name))
        for count in product_counts:
            values.append(str(count))
        for price in product_prices:
            values.append(str(price))
    else:
        values = []
        for field in fields:
            val = data.get(field, "")
            values.append(str(val) if val else "")
    
    # Join with semicolon
    sign_string = ";".join(values)
    
    # HMAC_MD5
    signature = hmac.new(
        secret_key.encode("utf-8"),
        sign_string.encode("utf-8"),
        hashlib.md5
    ).hexdigest()
    
    return signature


def verify_signature(payload: Dict[str, Any], secret_key: str) -> bool:
    """
    Verify WayForPay webhook/response signature.
    
    Signature string: merchantAccount;orderReference;amount;currency;authCode;cardPan;
                     transactionStatus;reasonCode
    """
    received_signature = payload.get("merchantSignature", "")
    if not received_signature:
        return False
    
    # Fields for response verification
    fields = [
        "merchantAccount", "orderReference", "amount", "currency",
        "authCode", "cardPan", "transactionStatus", "reasonCode"
    ]
    
    expected_signature = build_signature(payload, secret_key, fields)
    
    return hmac.compare_digest(received_signature.lower(), expected_signature.lower())


def build_response_signature(order_reference: str, status: str, time: int, secret_key: str) -> str:
    """
    Build signature for webhook response to WayForPay.
    
    Signature string: orderReference;status;time
    """
    sign_string = f"{order_reference};{status};{time}"
    
    signature = hmac.new(
        secret_key.encode("utf-8"),
        sign_string.encode("utf-8"),
        hashlib.md5
    ).hexdigest()
    
    return signature
