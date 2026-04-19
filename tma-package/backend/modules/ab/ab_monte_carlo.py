"""
A/B Monte Carlo Simulator - Probabilistic simulation with variance
"""
import random
import statistics
from typing import List, Dict


class ABMonteCarlo:
    
    @staticmethod
    def simulate(
        runs: int,
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
        Monte Carlo simulation for A/B testing.
        
        Runs N simulations with random noise to account for:
        - Conversion rate fluctuations
        - Order value variance
        - Return rate variance
        
        Returns:
            - Mean profit per variant
            - Percentiles (p10, p50, p90)
            - Winner probability
        """
        results = {v["key"]: [] for v in variants}

        for _ in range(runs):
            prepaid_total = int(orders_total * prepaid_share)

            # Add noise to parameters
            paid_noise = random.uniform(-0.02, 0.02)
            return_noise = random.uniform(-0.02, 0.02)
            grand_noise = random.uniform(-0.05, 0.05)

            for v in variants:
                discount_pct = float(v.get("discount_pct", 0))
                key = v["key"]

                # Calculate paid rate with uplift and noise
                uplift = elasticity * (discount_pct / 100.0)
                paid_rate = base_paid_rate + uplift + paid_noise
                paid_rate = max(0.01, min(0.99, paid_rate))

                # Adjusted return rate
                adj_return_rate = max(0.01, return_rate + return_noise)

                # Adjusted order value
                adj_grand = avg_grand * (1 + grand_noise)

                # Calculate metrics
                paid_orders = int(prepaid_total * paid_rate)
                revenue = paid_orders * adj_grand

                discount_cost = revenue * (discount_pct / 100.0)
                gross_margin = revenue * margin_rate
                return_losses = revenue * adj_return_rate * 0.5

                net_profit = gross_margin - discount_cost - return_losses

                results[key].append(net_profit)

        # Calculate summary statistics
        summary = []
        for key, profits in results.items():
            mean_profit = statistics.mean(profits)
            p50 = statistics.median(profits)
            std_dev = statistics.stdev(profits) if len(profits) > 1 else 0
            
            quantiles = statistics.quantiles(profits, n=10)
            p10 = quantiles[0]
            p90 = quantiles[8]

            variant_data = next(v for v in variants if v["key"] == key)
            
            summary.append({
                "variant": key,
                "discount_pct": variant_data.get("discount_pct", 0),
                "mean_profit": round(mean_profit, 2),
                "std_dev": round(std_dev, 2),
                "p10": round(p10, 2),
                "p50": round(p50, 2),
                "p90": round(p90, 2),
                "risk_adjusted": round(mean_profit - std_dev, 2),  # Sharpe-like
            })

        # Calculate winner probability
        winner_count = {v["key"]: 0 for v in variants}
        
        for i in range(runs):
            best_variant = None
            best_value = float("-inf")
            for key in results:
                val = results[key][i]
                if val > best_value:
                    best_value = val
                    best_variant = key
            if best_variant:
                winner_count[best_variant] += 1

        winner_prob = {
            key: round(count / runs, 4)
            for key, count in winner_count.items()
        }

        # Sort summary by mean_profit descending
        summary_sorted = sorted(summary, key=lambda x: x["mean_profit"], reverse=True)

        # Find expected winner
        expected_winner = summary_sorted[0]
        safest_winner = max(summary, key=lambda x: x["risk_adjusted"])

        return {
            "runs": runs,
            "input": {
                "orders_total": orders_total,
                "prepaid_share": prepaid_share,
                "avg_grand": avg_grand,
                "margin_rate": margin_rate,
                "base_paid_rate": base_paid_rate,
                "return_rate": return_rate,
                "elasticity": elasticity,
            },
            "summary": summary_sorted,
            "winner_probability": winner_prob,
            "expected_winner": {
                "variant": expected_winner["variant"],
                "discount_pct": expected_winner["discount_pct"],
                "mean_profit": expected_winner["mean_profit"],
                "probability": winner_prob.get(expected_winner["variant"], 0),
            },
            "safest_choice": {
                "variant": safest_winner["variant"],
                "discount_pct": safest_winner["discount_pct"],
                "risk_adjusted_profit": safest_winner["risk_adjusted"],
            },
            "recommendation": ABMonteCarlo._get_recommendation(summary_sorted, winner_prob),
        }

    @staticmethod
    def _get_recommendation(summary: List[Dict], winner_prob: Dict) -> str:
        """Generate human-readable recommendation"""
        if not summary:
            return "Недостатньо даних для рекомендації"
            
        best = summary[0]  # Already sorted by mean_profit descending
        
        # Check if control (0%) is best
        control = next((s for s in summary if s["discount_pct"] == 0), None)
        
        # If control is the best variant
        if control and control["variant"] == best["variant"]:
            return f"Control (0%) виграє. Знижка не потрібна."
        
        # If control exists and is very close to best
        if control and abs(control["mean_profit"] - best["mean_profit"]) / max(control["mean_profit"], 1) < 0.02:
            return f"Control (0%) майже рівний з {best['variant']} ({best['discount_pct']}%). Знижка не виправдана."
        
        # Best is a discount variant
        best_prob = winner_prob.get(best["variant"], 0)
        control_profit = control["mean_profit"] if control else 0
        profit_gain = best["mean_profit"] - control_profit
        
        if best_prob < 0.5:
            return f"Невизначений результат. Варіант {best['variant']} ({best['discount_pct']}%) лідирує з ймовірністю лише {best_prob:.0%}. Потрібно більше даних."
        
        if best_prob >= 0.7:
            return f"Впевнений переможець: {best['variant']} ({best['discount_pct']}%) з ймовірністю {best_prob:.0%}. Додатковий прибуток: +{profit_gain:,.0f} грн. Рекомендовано застосувати."
        
        return f"Варіант {best['variant']} ({best['discount_pct']}%) лідирує з ймовірністю {best_prob:.0%}. Продовжуйте тестування."
