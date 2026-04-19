"""
Security Middleware - Headers, Rate Limiting, Anti-abuse
"""
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from .rate_limiter import api_limiter, auth_limiter, checkout_limiter
import hashlib
import time


class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Security middleware for FastAPI
    - Security headers
    - Rate limiting
    - Anti-abuse timing
    """
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Get client identifier
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        
        # Select appropriate rate limiter
        if "/auth" in path or "/login" in path or "/register" in path:
            limiter = auth_limiter
        elif "/checkout" in path or "/orders/create" in path:
            limiter = checkout_limiter
        else:
            limiter = api_limiter
        
        # Check rate limit (skip for static files and health checks)
        if not path.startswith("/static") and path not in ["/health", "/api/health"]:
            allowed, reason = await limiter.is_allowed(client_ip)
            if not allowed:
                return Response(
                    content=f'{{"error": "{reason}"}}',
                    status_code=429,
                    media_type="application/json",
                    headers={"Retry-After": "60"}
                )
        
        # Process request
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # Add timing header for debugging (remove in production if needed)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(round(process_time, 4))
        
        return response


# Create middleware instance
security_middleware = SecurityMiddleware


def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Verify webhook signature for payment providers
    """
    expected = hashlib.sha256(payload + secret.encode()).hexdigest()
    return signature == expected


def is_safe_ip(ip: str, allowed_ips: list) -> bool:
    """
    Check if IP is in allowed list (for webhook IP validation)
    """
    if not allowed_ips:
        return True
    return ip in allowed_ips


# Honeypot check for forms
def check_honeypot(data: dict, honeypot_field: str = "_hp_field") -> bool:
    """
    Check if honeypot field was filled (bot detection)
    Returns True if suspicious (bot)
    """
    honeypot_value = data.get(honeypot_field, "")
    return bool(honeypot_value)  # If filled, it's a bot


def check_timing(start_time: float, min_time_ms: int = 500) -> bool:
    """
    Check if form was submitted too fast (bot detection)
    Returns True if suspicious (too fast)
    """
    elapsed = (time.time() - start_time) * 1000
    return elapsed < min_time_ms
