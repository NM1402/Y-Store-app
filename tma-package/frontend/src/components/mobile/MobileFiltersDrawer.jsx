/**
 * MobileFiltersDrawer - Bottom sheet filters for mobile
 * B16 Mobile Retail Polish
 */
import React, { useEffect } from "react";
import { X, SlidersHorizontal } from "lucide-react";

export default function MobileFiltersDrawer({ open, onClose, onApply, children }) {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="ys-drawer-backdrop" onClick={onClose} />
      <div className="ys-drawer ys-drawer-bottom" data-testid="mobile-filters-drawer">
        <div className="ys-drawer-header">
          <div className="ys-drawer-title">
            <SlidersHorizontal size={18} />
            Фільтри
          </div>
          <button className="ys-drawer-close" onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>

        <div className="ys-drawer-body">
          {children}
        </div>

        <div className="ys-drawer-footer">
          <button 
            className="ys-btn ys-btn-secondary" 
            onClick={onClose}
          >
            Скасувати
          </button>
          <button 
            className="ys-btn ys-btn-primary" 
            onClick={() => {
              onApply?.();
              onClose();
            }}
          >
            Застосувати
          </button>
        </div>
      </div>
    </>
  );
}
