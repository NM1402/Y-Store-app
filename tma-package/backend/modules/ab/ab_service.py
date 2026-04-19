"""
A/B Test Service - Stable cohort assignment
"""
import hashlib
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def _hash_unit(s: str) -> int:
    """Stable hash for consistent assignment"""
    h = hashlib.sha256(s.encode("utf-8")).hexdigest()
    return int(h[:12], 16)


class ABService:
    def __init__(self, db):
        self.db = db
        self.experiments = db["ab_experiments"]
        self.assignments = db["ab_assignments"]

    async def ensure_indexes(self):
        await self.assignments.create_index([("exp_id", 1), ("unit", 1)], unique=True)
        await self.experiments.create_index("id", unique=True)

    async def get_active_experiment(self, exp_id: str) -> dict:
        """Get active experiment by ID"""
        await self.ensure_indexes()
        exp = await self.experiments.find_one({"id": exp_id, "active": True}, {"_id": 0})
        return exp

    async def get_experiment(self, exp_id: str) -> dict:
        """Get experiment by ID (active or not)"""
        exp = await self.experiments.find_one({"id": exp_id}, {"_id": 0})
        return exp

    def _pick_variant(self, exp: dict, unit: str) -> dict:
        """Pick variant based on weighted hash"""
        variants = exp.get("variants") or []
        if not variants:
            return {"key": "A", "discount_pct": 0.0, "weight": 100}

        total_weight = sum(int(v.get("weight", 0)) for v in variants) or 100
        x = _hash_unit(f"{exp['id']}:{unit}") % 10000
        threshold = (x / 10000.0) * total_weight

        accumulated = 0.0
        for v in variants:
            accumulated += float(v.get("weight", 0))
            if threshold <= accumulated:
                return v
        
        return variants[-1]

    async def get_assignment(self, exp_id: str, unit: str) -> dict:
        """
        Get or create assignment for a unit (phone/user_id).
        
        Returns:
            {exp_id, unit, variant, discount_pct, active}
        """
        exp = await self.get_active_experiment(exp_id)
        if not exp:
            return {
                "exp_id": exp_id,
                "unit": unit,
                "variant": None,
                "discount_pct": None,
                "active": False
            }

        # Check existing assignment
        doc = await self.assignments.find_one(
            {"exp_id": exp_id, "unit": unit},
            {"_id": 0}
        )
        
        if doc:
            variant = next(
                (v for v in exp.get("variants", []) if v["key"] == doc["variant"]),
                None
            )
            return {
                "exp_id": exp_id,
                "unit": unit,
                "variant": doc["variant"],
                "discount_pct": (variant or {}).get("discount_pct", 0.0),
                "active": True,
            }

        # Create new assignment
        variant = self._pick_variant(exp, unit)
        doc = {
            "exp_id": exp_id,
            "unit": unit,
            "variant": variant["key"],
            "assigned_at": now_iso()
        }
        
        try:
            await self.assignments.insert_one(doc)
        except Exception:
            # Race condition - fetch existing
            existing = await self.assignments.find_one(
                {"exp_id": exp_id, "unit": unit},
                {"_id": 0}
            )
            if existing:
                return {
                    "exp_id": exp_id,
                    "unit": unit,
                    "variant": existing["variant"],
                    "discount_pct": variant.get("discount_pct", 0.0),
                    "active": True,
                }

        logger.debug(f"A/B assignment created: {exp_id}/{unit} -> {variant['key']}")
        
        return {
            "exp_id": exp_id,
            "unit": unit,
            "variant": variant["key"],
            "discount_pct": float(variant.get("discount_pct", 0.0)),
            "active": True,
        }

    async def create_experiment(self, exp: dict) -> dict:
        """Create or update an experiment"""
        await self.ensure_indexes()
        exp["created_at"] = exp.get("created_at") or now_iso()
        exp["updated_at"] = now_iso()
        
        await self.experiments.update_one(
            {"id": exp["id"]},
            {"$set": exp},
            upsert=True
        )
        return exp

    async def list_experiments(self, active_only: bool = False) -> list:
        """List all experiments"""
        query = {"active": True} if active_only else {}
        cursor = self.experiments.find(query, {"_id": 0}).sort("created_at", -1)
        return await cursor.to_list(100)

    async def deactivate_experiment(self, exp_id: str) -> dict:
        """Deactivate an experiment"""
        await self.experiments.update_one(
            {"id": exp_id},
            {"$set": {"active": False, "deactivated_at": now_iso()}}
        )
        return {"ok": True}

    async def update_weights(self, exp_id: str, new_weights: dict) -> dict:
        """Update variant weights (for bandit optimization)"""
        exp = await self.get_experiment(exp_id)
        if not exp:
            return {"ok": False, "error": "NOT_FOUND"}
        
        variants = exp.get("variants", [])
        for v in variants:
            if v["key"] in new_weights:
                v["weight"] = new_weights[v["key"]]
        
        await self.experiments.update_one(
            {"id": exp_id},
            {"$set": {"variants": variants, "updated_at": now_iso()}}
        )
        
        return {"ok": True, "variants": variants}
