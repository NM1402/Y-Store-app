/**
 * CompareBar - Sticky bottom bar for compare
 * BLOCK V2-19
 */
import React from "react";
import { useComparison } from "../../contexts/ComparisonContext";
import { useNavigate } from "react-router-dom";
import { Scale, Trash2, X } from "lucide-react";

export default function CompareBar() {
  const { comparisonItems, comparisonCount, clearComparison, removeFromComparison, maxItems } = useComparison();
  const nav = useNavigate();

  if (comparisonCount === 0) return null;

  return (
    <div 
      data-testid="compare-bar-global"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-4 rounded-2xl flex items-center gap-6 z-50 shadow-2xl"
    >
      {/* Product thumbnails */}
      <div className="flex items-center gap-2">
        {comparisonItems.map((item) => (
          <div key={item.id} className="relative group">
            <div className="w-12 h-12 bg-white rounded-lg overflow-hidden">
              <img 
                src={item.images?.[0] || 'https://via.placeholder.com/48'} 
                alt={item.name || item.title}
                className="w-full h-full object-cover"
              />
            </div>
            <button
              onClick={() => removeFromComparison(item.id)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="flex items-center gap-3">
        <Scale className="w-5 h-5 text-blue-400" />
        <span className="font-semibold text-sm">
          {comparisonCount}/{maxItems} товарів
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={clearComparison}
          className="p-2 text-gray-400 hover:text-red-400 transition rounded-lg hover:bg-white/10"
          title="Очистити"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => nav("/compare")}
          disabled={comparisonCount < 2}
          className={`px-5 py-2 rounded-xl font-bold text-sm transition ${
            comparisonCount >= 2 
              ? 'bg-blue-500 hover:bg-blue-600 text-white' 
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          Порівняти
        </button>
      </div>
    </div>
  );
}
