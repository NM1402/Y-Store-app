"""
A/B Simulator - Simple deterministic simulation
"""
from typing import List, Dict


class ABSimulator:
    
    @staticmethod
    def simulate(
        orders_total: int,
        prepaid_share: float,
        avg_grand: float,
        margin_rate: float,
        base_paid_rate: float,
        return_rate: float,
        elasticity: float,
        variants: List[Dict]
    ) -> Dict:
        """
        Simulate A/B test results without real traffic.
        
        Args:
            orders_total: Total orders in simulation period
            prepaid_share: Share of FULL_PREPAID orders (0.0-1.0)
            avg_grand: Average order value in UAH
            margin_rate: Gross margin rate (e.g., 0.41 for 41%)
            base_paid_rate: Base paid rate without discount
            return_rate: Return rate
            elasticity: Conversion uplift per 1% discount (e.g., 0.6 means +0.6% conversion per 1% discount)
            variants: List of {"key": "A", "discount_pct": 0.0}
            
        Returns:
            Simulation results with winner
        """
        results = []
        prepaid_total = int(orders_total * prepaid_share)

        for v in variants:
            discount_pct = float(v.get("discount_pct", 0))
            key = v.get("key")

            # Calculate uplift from discount
            uplift = elasticity * (discount_pct / 100.0)
            paid_rate = base_paid_rate + uplift
            paid_rate = min(paid_rate, 0.99)

            paid_orders = int(prepaid_total * paid_rate)
            revenue = paid_orders * avg_grand

            # Costs
            discount_cost = revenue * (discount_pct / 100.0)
            gross_margin = revenue * margin_rate
            return_losses = revenue * return_rate * 0.5  # ~50% of return cost

            net_profit = gross_margin - discount_cost - return_losses

            results.append({
                "variant": key,
                "discount_pct": discount_pct,
                "paid_rate": round(paid_rate, 4),
                "paid_orders": paid_orders,
                "revenue": round(revenue, 2),
                "discount_cost": round(discount_cost, 2),
                "gross_margin": round(gross_margin, 2),
                "return_losses": round(return_losses, 2),
                "net_profit": round(net_profit, 2),
            })

        # Find winner by net_profit
        winner = max(results, key=lambda x: x["net_profit"])

        # Calculate break-even
        control = next((r for r in results if r["discount_pct"] == 0), results[0])
        break_even = []
        for r in results:
            if r["discount_pct"] > 0:
                cost = r["discount_cost"]
                extra_margin = r["gross_margin"] - control["gross_margin"]
                profitable = extra_margin > cost
                break_even.append({
                    "variant": r["variant"],
                    "discount_pct": r["discount_pct"],
                    "discount_cost": cost,
                    "extra_margin": round(extra_margin, 2),
                    "profitable": profitable,
                    "net_effect": round(extra_margin - cost, 2)
                })

        return {
            "input": {
                "orders_total": orders_total,
                "prepaid_total": prepaid_total,
                "prepaid_share": prepaid_share,
                "avg_grand": avg_grand,
                "margin_rate": margin_rate,
                "base_paid_rate": base_paid_rate,
                "return_rate": return_rate,
                "elasticity": elasticity,
            },
            "results": results,
            "winner": {
                "variant": winner["variant"],
                "discount_pct": winner["discount_pct"],
                "net_profit": winner["net_profit"],
            },
            "break_even_analysis": break_even,
        }
