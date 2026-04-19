"""
O16: Risk Types
"""
from typing import List, Literal, Optional, Dict, Any
from pydantic import BaseModel

RiskBand = Literal["LOW", "WATCH", "RISK"]


class RiskResult(BaseModel):
    score: int
    band: RiskBand
    reasons: List[str]
    components: Dict[str, Any]
