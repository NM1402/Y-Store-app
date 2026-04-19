"""
Rate Limiter - In-memory rate limiting (Redis-ready)
"""
from collections import defaultdict
from datetime import datetime, timezone
import asyncio
from typing import Dict, Tuple


class RateLimiter:
    """
    In-memory rate limiter with sliding window
    Can be extended to use Redis for distributed systems
    """
    
    def __init__(self, requests_per_minute: int = 60, requests_per_hour: int = 1000):
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.minute_counters: Dict[str, list] = defaultdict(list)
        self.hour_counters: Dict[str, list] = defaultdict(list)
        self._lock = asyncio.Lock()
    
    async def is_allowed(self, identifier: str) -> Tuple[bool, str]:
        """
        Check if request is allowed
        Returns (allowed, reason)
        """
        async with self._lock:
            now = datetime.now(timezone.utc)
            minute_ago = now.timestamp() - 60
            hour_ago = now.timestamp() - 3600
            
            # Clean old entries
            self.minute_counters[identifier] = [
                t for t in self.minute_counters[identifier] if t > minute_ago
            ]
            self.hour_counters[identifier] = [
                t for t in self.hour_counters[identifier] if t > hour_ago
            ]
            
            # Check limits
            if len(self.minute_counters[identifier]) >= self.requests_per_minute:
                return False, f"Rate limit exceeded: {self.requests_per_minute}/min"
            
            if len(self.hour_counters[identifier]) >= self.requests_per_hour:
                return False, f"Rate limit exceeded: {self.requests_per_hour}/hour"
            
            # Record request
            current_time = now.timestamp()
            self.minute_counters[identifier].append(current_time)
            self.hour_counters[identifier].append(current_time)
            
            return True, "OK"
    
    def get_stats(self, identifier: str) -> dict:
        """Get current usage stats for identifier"""
        return {
            "requests_last_minute": len(self.minute_counters.get(identifier, [])),
            "requests_last_hour": len(self.hour_counters.get(identifier, [])),
            "limit_per_minute": self.requests_per_minute,
            "limit_per_hour": self.requests_per_hour
        }


# Global instances for different endpoints
api_limiter = RateLimiter(requests_per_minute=300, requests_per_hour=5000)
auth_limiter = RateLimiter(requests_per_minute=30, requests_per_hour=200)
webhook_limiter = RateLimiter(requests_per_minute=100, requests_per_hour=5000)
checkout_limiter = RateLimiter(requests_per_minute=50, requests_per_hour=500)
