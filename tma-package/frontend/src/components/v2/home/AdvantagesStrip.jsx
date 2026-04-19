import React from "react";
import { Truck, Shield, CreditCard, RefreshCw } from "lucide-react";

const ICONS = {
  truck: Truck,
  shield: Shield,
  card: CreditCard,
  refresh: RefreshCw,
};

export default function AdvantagesStrip({ items = [], lang = "uk" }) {
  return (
    <section className="v2-advantages">
      <div className="container v2-adv-grid">
        {items.map((it, idx) => {
          const Icon = ICONS[it.icon] || Shield;
          return (
            <div key={idx} className="v2-adv-card">
              <div className="v2-adv-ic">
                <Icon size={24} />
              </div>
              <div className="v2-adv-title">{it.title?.[lang] || it.title}</div>
              <div className="v2-adv-text">{it.text?.[lang] || it.text}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
