/**
 * ProductAttributesEditor - Edit product attributes based on category filterSchema
 * Auto-populates fields from category filters
 */
import React from "react";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { AlertCircle } from "lucide-react";

export default function ProductAttributesEditor({ 
  filters = [], 
  value = {}, 
  onChange,
  lang = "uk"
}) {
  const setAttr = (key, val) => {
    onChange?.({ ...(value || {}), [key]: val });
  };

  // Filter out price and in_stock - they're not attributes
  const editableFilters = filters.filter(f => !["price", "in_stock"].includes(f.key));

  if (editableFilters.length === 0) {
    return (
      <div className="border rounded-xl p-4 bg-gray-50" data-testid="product-attributes-editor">
        <h4 className="font-bold text-gray-900 mb-2">Атрибути товару</h4>
        <div className="text-center py-6 text-gray-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>Для категорії не налаштовані фільтри</p>
          <p className="text-sm mt-1">Додайте filterSchema в категорії щоб редагувати атрибути</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-xl p-4 bg-gray-50" data-testid="product-attributes-editor">
      <div className="mb-4">
        <h4 className="font-bold text-gray-900">Атрибути товару (attributes)</h4>
        <p className="text-sm text-gray-500 mt-1">
          Поля автоматично створені з filterSchema категорії
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {editableFilters.map((f) => (
          <div key={f.key}>
            <Label className="text-sm">
              {f.label} <span className="text-gray-400 text-xs">({f.key})</span>
            </Label>

            {f.type === "select" || f.type === "color" ? (
              f.options && f.options.length > 0 ? (
                // Select from existing options
                <select
                  className="w-full h-10 px-3 border rounded-md text-sm mt-1"
                  value={value?.[f.key] || ""}
                  onChange={(e) => setAttr(f.key, e.target.value)}
                >
                  <option value="">— Оберіть —</option>
                  {f.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                // Free text input if no options yet
                <div>
                  <Input
                    value={value?.[f.key] || ""}
                    onChange={(e) => setAttr(f.key, e.target.value)}
                    placeholder="Введіть значення"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Немає варіантів - введіть нове значення
                  </p>
                </div>
              )
            ) : (
              // Default text input
              <Input
                value={value?.[f.key] || ""}
                onChange={(e) => setAttr(f.key, e.target.value)}
                placeholder="Значення атрибуту"
                className="mt-1"
              />
            )}
          </div>
        ))}
      </div>

      {/* Show raw JSON for debugging */}
      <div className="mt-4 pt-4 border-t">
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-gray-700">
            Показати JSON атрибутів
          </summary>
          <pre className="mt-2 p-2 bg-white border rounded text-xs overflow-auto">
            {JSON.stringify(value || {}, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
