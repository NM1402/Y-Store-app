"""
O17: Timeline Service - Customer Event Stream
"""
from datetime import datetime
from typing import List, Dict, Any


class TimelineService:
    def __init__(self, db):
        self.db = db

    async def get_customer_timeline(self, user_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        events = []

        # Orders
        orders_cursor = self.db["orders"].find(
            {"buyer_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(50)

        async for o in orders_cursor:
            # Order created event
            events.append({
                "ts": o.get("created_at"),
                "type": "ORDER_CREATED",
                "title": "Order Created",
                "description": f"ID {o.get('id')[:8]}... | {o.get('status')} | {o.get('total_amount', 0):.2f} {o.get('currency', 'UAH')}",
                "payload": {"order_id": o.get("id")}
            })

            # TTN if exists
            if o.get("shipment", {}).get("ttn"):
                events.append({
                    "ts": o.get("shipment", {}).get("created_at") or o.get("updated_at"),
                    "type": "TTN_CREATED",
                    "title": "TTN Created",
                    "description": f"TTN {o.get('shipment', {}).get('ttn')}",
                    "payload": {"ttn": o.get("shipment", {}).get("ttn")}
                })

        # CRM notes
        notes_cursor = self.db["crm_notes"].find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(20)
        async for n in notes_cursor:
            events.append({
                "ts": n.get("created_at"),
                "type": "CRM_NOTE",
                "title": "CRM Note",
                "description": n.get("note", "")[:100],
                "payload": {"note_id": n.get("id")}
            })

        # Guard incidents
        incidents_cursor = self.db["guard_incidents"].find(
            {"entity": f"customer:{user_id}"},
            {"_id": 0}
        ).sort("created_at", -1).limit(20)
        async for inc in incidents_cursor:
            events.append({
                "ts": inc.get("created_at"),
                "type": "GUARD_INCIDENT",
                "title": f"Incident: {inc.get('title', 'Unknown')}",
                "description": f"{inc.get('type')} | {inc.get('status')}",
                "payload": {"incident_key": inc.get("key")}
            })

        # Risk updates
        user = await self.db["users"].find_one({"id": user_id}, {"_id": 0, "risk": 1})
        if user and user.get("risk"):
            events.append({
                "ts": user["risk"].get("updated_at"),
                "type": "RISK_UPDATED",
                "title": "Risk Score Updated",
                "description": f"Score {user['risk'].get('score')}/100 | {user['risk'].get('band')}",
                "payload": {"risk": user["risk"]}
            })

        # Sort by timestamp DESC
        events = sorted(
            [e for e in events if e.get("ts")],
            key=lambda x: x["ts"],
            reverse=True
        )

        return events[:limit]
