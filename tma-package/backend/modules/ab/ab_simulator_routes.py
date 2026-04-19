"""
A/B Simulator Routes - Simulation endpoints
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import List
from core.security import get_current_admin

from .ab_simulator import ABSimulator
from .ab_monte_carlo import ABMonteCarlo

router = APIRouter(tags=["A/B Simulation"])


class VariantInput(BaseModel):
    key: str
    discount_pct: float = Field(ge=0, le=10)


class SimulateRequest(BaseModel):
    orders_total: int = Field(default=1200, ge=10, le=100000)
    prepaid_share: float = Field(default=0.4, ge=0.1, le=1.0)
    avg_grand: float = Field(default=2500, ge=100, le=100000)
    margin_rate: float = Field(default=0.41, ge=0.05, le=0.9)
    base_paid_rate: float = Field(default=0.68, ge=0.1, le=0.99)
    return_rate: float = Field(default=0.1, ge=0, le=0.5)
    elasticity: float = Field(default=0.6, ge=0, le=3.0)
    variants: List[VariantInput] = Field(
        default=[
            VariantInput(key="A", discount_pct=0),
            VariantInput(key="B", discount_pct=1.0),
            VariantInput(key="C", discount_pct=1.5),
        ]
    )


class MonteCarloRequest(SimulateRequest):
    runs: int = Field(default=2000, ge=100, le=10000)


@router.post("/simulate")
async def simulate_ab(
    req: SimulateRequest,
    current_user: dict = Depends(get_current_admin)
):
    """
    Simple deterministic A/B simulation.
    
    Calculates expected outcomes based on input parameters.
    Good for quick estimates and break-even analysis.
    """
    return ABSimulator.simulate(
        orders_total=req.orders_total,
        prepaid_share=req.prepaid_share,
        avg_grand=req.avg_grand,
        margin_rate=req.margin_rate,
        base_paid_rate=req.base_paid_rate,
        return_rate=req.return_rate,
        elasticity=req.elasticity,
        variants=[v.model_dump() for v in req.variants]
    )


@router.post("/monte-carlo")
async def monte_carlo_simulation(
    req: MonteCarloRequest,
    current_user: dict = Depends(get_current_admin)
):
    """
    Monte Carlo A/B simulation with probabilistic outcomes.
    
    Runs N simulations with random noise to account for:
    - Conversion rate fluctuations (±2%)
    - Order value variance (±5%)
    - Return rate variance (±2%)
    
    Returns:
    - Mean profit per variant
    - Risk metrics (p10, p50, p90, std_dev)
    - Winner probability
    - Recommendation
    """
    return ABMonteCarlo.simulate(
        runs=req.runs,
        orders_total=req.orders_total,
        prepaid_share=req.prepaid_share,
        avg_grand=req.avg_grand,
        margin_rate=req.margin_rate,
        base_paid_rate=req.base_paid_rate,
        return_rate=req.return_rate,
        elasticity=req.elasticity,
        variants=[v.model_dump() for v in req.variants]
    )


@router.post("/quick-estimate")
async def quick_estimate(
    monthly_revenue: float = 500000,
    prepaid_share: float = 0.4,
    margin_rate: float = 0.41,
    discount_pct: float = 1.0,
    current_user: dict = Depends(get_current_admin)
):
    """
    Quick break-even estimate for a given discount.
    
    Formula: X >= (d * P) / (m - d)
    where X = additional revenue needed to break even
    """
    prepaid_revenue = monthly_revenue * prepaid_share
    d = discount_pct / 100.0
    m = margin_rate
    
    if m <= d:
        return {
            "error": "Margin rate must be greater than discount rate",
            "margin_rate": m,
            "discount_pct": d
        }
    
    discount_cost = prepaid_revenue * d
    break_even_revenue = (d * prepaid_revenue) / (m - d)
    
    # Estimate orders needed
    avg_order = 2500
    break_even_orders = int(break_even_revenue / avg_order) + 1
    
    return {
        "input": {
            "monthly_revenue": monthly_revenue,
            "prepaid_revenue": prepaid_revenue,
            "margin_rate": f"{m:.0%}",
            "discount_pct": f"{d:.1%}",
        },
        "discount_cost": round(discount_cost, 2),
        "break_even_revenue": round(break_even_revenue, 2),
        "break_even_orders": break_even_orders,
        "verdict": "Safe" if break_even_orders <= 3 else "Needs monitoring" if break_even_orders <= 5 else "Risky"
    }
