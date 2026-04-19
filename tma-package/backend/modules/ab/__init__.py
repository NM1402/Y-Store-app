"""
A/B Testing Module
"""
from .ab_routes import router
from .ab_simulator_routes import router as simulator_router

__all__ = ["router", "simulator_router"]
