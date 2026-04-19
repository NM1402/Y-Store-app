/**
 * Pagination - умная пагинация с многоточием
 */
import React from "react";

export default function Pagination({ page, pages, onPage }) {
  if (!pages || pages <= 1) return null;

  const maxButtons = 7;
  const half = Math.floor(maxButtons / 2);

  let start = Math.max(1, page - half);
  let end = Math.min(pages, start + maxButtons - 1);
  start = Math.max(1, end - maxButtons + 1);

  const nums = [];
  for (let i = start; i <= end; i++) nums.push(i);

  return (
    <div className="ys-pagination">
      <button 
        className="ys-btn ys-btn-ghost" 
        disabled={page <= 1} 
        onClick={() => onPage(page - 1)}
        style={{ height: 40, width: 40, padding: 0, borderRadius: 10 }}
      >
        ←
      </button>

      {start > 1 && (
        <>
          <button 
            className="ys-btn ys-btn-ghost" 
            onClick={() => onPage(1)}
            style={{ height: 40, minWidth: 40, padding: "0 12px", borderRadius: 10 }}
          >
            1
          </button>
          {start > 2 && <span className="ys-pagination__dots">…</span>}
        </>
      )}

      {nums.map((n) => (
        <button
          key={n}
          className={`ys-btn ys-btn-ghost ${n === page ? "is-active" : ""}`}
          onClick={() => onPage(n)}
          style={{ height: 40, minWidth: 40, padding: "0 12px", borderRadius: 10 }}
        >
          {n}
        </button>
      ))}

      {end < pages && (
        <>
          {end < pages - 1 && <span className="ys-pagination__dots">…</span>}
          <button 
            className="ys-btn ys-btn-ghost" 
            onClick={() => onPage(pages)}
            style={{ height: 40, minWidth: 40, padding: "0 12px", borderRadius: 10 }}
          >
            {pages}
          </button>
        </>
      )}

      <button 
        className="ys-btn ys-btn-ghost" 
        disabled={page >= pages} 
        onClick={() => onPage(page + 1)}
        style={{ height: 40, width: 40, padding: 0, borderRadius: 10 }}
      >
        →
      </button>
    </div>
  );
}
