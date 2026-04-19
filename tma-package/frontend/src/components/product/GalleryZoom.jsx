import React, { useMemo, useRef, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";

export default function GalleryZoom({ images = [] }) {
  const imgs = useMemo(() => (Array.isArray(images) ? images.filter(Boolean) : []), [images]);
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const boxRef = useRef(null);

  const current = imgs[idx] || imgs[0] || null;

  const onMove = (e) => {
    if (!zoom) return;
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  return (
    <div className="ys-gallery" data-testid="product-gallery">
      <div className="ys-gallery-main" ref={boxRef} onMouseMove={onMove}>
        {current ? (
          <img
            src={current}
            alt=""
            className={"ys-gallery-img" + (zoom ? " is-zoom" : "")}
            style={zoom ? { transformOrigin: `${pos.x}% ${pos.y}%` } : undefined}
            onClick={() => setZoom((v) => !v)}
            draggable={false}
          />
        ) : (
          <div className="ys-gallery-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
            <span>Немає фото</span>
          </div>
        )}

        {current && (
          <button className="ys-zoom-btn" onClick={() => setZoom((v) => !v)} type="button" data-testid="zoom-btn">
            {zoom ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
          </button>
        )}
      </div>

      {imgs.length > 1 && (
        <div className="ys-gallery-thumbs">
          {imgs.slice(0, 10).map((src, i) => (
            <button
              key={src + i}
              type="button"
              className={"ys-thumb" + (i === idx ? " is-active" : "")}
              onClick={() => {
                setIdx(i);
                setZoom(false);
              }}
              data-testid={`gallery-thumb-${i}`}
            >
              <img src={src} alt="" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
