import React, { useState } from "react";
import axios from "axios";
import { Package, Truck, CheckCircle, XCircle, RefreshCw, Clock, MapPin } from "lucide-react";

const STATUS_CONFIG = {
  NEW: { label: "Новий", color: "bg-gray-100 text-gray-700", icon: Clock },
  AWAITING_PAYMENT: { label: "Очікує оплати", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  PAID: { label: "Оплачено", color: "bg-green-100 text-green-700", icon: CheckCircle },
  PROCESSING: { label: "Обробляється", color: "bg-blue-100 text-blue-700", icon: Package },
  SHIPPED: { label: "Відправлено", color: "bg-purple-100 text-purple-700", icon: Truck },
  DELIVERED: { label: "Доставлено", color: "bg-green-100 text-green-700", icon: CheckCircle },
  RETURNED: { label: "Повернено", color: "bg-orange-100 text-orange-700", icon: RefreshCw },
  CANCELLED: { label: "Скасовано", color: "bg-red-100 text-red-700", icon: XCircle },
  REFUND_REQUESTED: { label: "Запит на повернення", color: "bg-orange-100 text-orange-700", icon: RefreshCw },
  REFUNDED: { label: "Кошти повернено", color: "bg-green-100 text-green-700", icon: CheckCircle },
};

export default function OrderCard({ order, onRefresh }) {
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.NEW;
  const StatusIcon = statusConfig.icon;

  const loadTracking = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`/api/v2/orders/${order.id}/tracking`);
      setTracking(r.data);
      setExpanded(true);
    } catch (err) {
      console.error("Tracking fetch failed:", err);
    }
    setLoading(false);
  };

  const refreshTracking = async () => {
    setLoading(true);
    try {
      const r = await axios.post(`/api/v2/orders/${order.id}/refresh-tracking`);
      setTracking((prev) => ({
        ...prev,
        np_status: r.data.np_status,
        np_tracking: r.data.np_tracking,
      }));
    } catch (err) {
      console.error("Tracking refresh failed:", err);
    }
    setLoading(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("uk-UA", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalAmount = order.totals?.grand || order.total || 0;
  const itemsCount = order.items?.length || 0;
  const shipment = order.shipment || {};

  return (
    <div className="order-card">
      {/* Header */}
      <div className="order-card-header">
        <div className="order-card-id">
          <span className="order-number">№ {order.id?.slice(0, 8) || order.id}</span>
          <span className="order-date">{formatDate(order.created_at)}</span>
        </div>
        <div className={`order-status ${statusConfig.color}`}>
          <StatusIcon size={14} />
          <span>{statusConfig.label}</span>
        </div>
      </div>

      {/* Summary */}
      <div className="order-card-summary">
        <div className="order-items-count">
          <Package size={16} />
          <span>{itemsCount} товар(ів)</span>
        </div>
        <div className="order-total">
          <span className="order-total-value">{totalAmount.toLocaleString()} грн</span>
        </div>
      </div>

      {/* Items preview */}
      {order.items && order.items.length > 0 && (
        <div className="order-items-preview">
          {order.items.slice(0, 3).map((item, idx) => (
            <div key={idx} className="order-item-mini">
              {item.image && <img src={item.image} alt={item.name} />}
              <span className="order-item-name">{item.name || item.product_name || `Товар ${idx + 1}`}</span>
              <span className="order-item-qty">×{item.qty || item.quantity || 1}</span>
            </div>
          ))}
          {order.items.length > 3 && (
            <div className="order-items-more">+{order.items.length - 3} ще</div>
          )}
        </div>
      )}

      {/* TTN / Tracking */}
      {shipment.ttn && (
        <div className="order-ttn-row">
          <div className="order-ttn-label">
            <Truck size={16} />
            <span>ТТН:</span>
          </div>
          <code className="order-ttn-value">{shipment.ttn}</code>
          <button 
            className="order-track-btn"
            onClick={loadTracking}
            disabled={loading}
          >
            {loading ? "..." : "Відстежити"}
          </button>
        </div>
      )}

      {/* Track button if no TTN shown */}
      {!shipment.ttn && order.status === "SHIPPED" && (
        <button className="order-track-btn full" onClick={loadTracking} disabled={loading}>
          {loading ? "Завантаження..." : "Відстежити посилку"}
        </button>
      )}

      {/* Tracking details */}
      {tracking && expanded && (
        <div className="order-tracking-box">
          <div className="order-tracking-header">
            <h4>Інформація про доставку</h4>
            <button onClick={refreshTracking} disabled={loading} className="refresh-btn">
              <RefreshCw size={14} className={loading ? "spin" : ""} />
            </button>
          </div>

          {tracking.ttn && (
            <div className="tracking-detail">
              <span className="tracking-label">ТТН:</span>
              <code>{tracking.ttn}</code>
            </div>
          )}

          {tracking.np_tracking && (
            <>
              <div className="tracking-detail">
                <span className="tracking-label">Статус:</span>
                <span className="tracking-value status">{tracking.np_tracking.status}</span>
              </div>
              
              {tracking.np_tracking.city_sender && (
                <div className="tracking-detail">
                  <MapPin size={14} />
                  <span>{tracking.np_tracking.city_sender} → {tracking.np_tracking.city_recipient}</span>
                </div>
              )}
              
              {tracking.np_tracking.warehouse_recipient && (
                <div className="tracking-detail small">
                  <span className="tracking-label">Відділення:</span>
                  <span>{tracking.np_tracking.warehouse_recipient}</span>
                </div>
              )}
              
              {tracking.np_tracking.scheduled_delivery_date && (
                <div className="tracking-detail">
                  <span className="tracking-label">Очікувана доставка:</span>
                  <span>{tracking.np_tracking.scheduled_delivery_date}</span>
                </div>
              )}
            </>
          )}

          {/* Timeline */}
          {tracking.timeline && tracking.timeline.length > 0 && (
            <div className="tracking-timeline">
              <h5>Історія замовлення</h5>
              {tracking.timeline.map((entry, idx) => (
                <div key={idx} className="timeline-entry">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <span className="timeline-status">
                      {STATUS_CONFIG[entry.to]?.label || entry.to}
                    </span>
                    <span className="timeline-date">{formatDate(entry.at)}</span>
                    {entry.reason && entry.reason !== "CURRENT_STATUS" && (
                      <span className="timeline-reason">{entry.reason}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="order-card-actions">
        {!expanded && (
          <button className="order-action-btn" onClick={() => setExpanded(true)}>
            Деталі
          </button>
        )}
        {expanded && (
          <button className="order-action-btn" onClick={() => setExpanded(false)}>
            Згорнути
          </button>
        )}
        {order.status === "DELIVERED" && (
          <button className="order-action-btn refund">
            Повернення
          </button>
        )}
      </div>
    </div>
  );
}
