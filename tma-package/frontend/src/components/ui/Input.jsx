import React from "react";

/**
 * Unified Input Component
 * BLOCK V2-11 - Design System
 */
export default function Input({
  type = "text",
  placeholder,
  value,
  onChange,
  disabled = false,
  error = false,
  icon,
  className = "",
  ...props
}) {
  return (
    <div className={`ui-input-wrap ${error ? "error" : ""} ${className}`.trim()}>
      {icon && <span className="ui-input-icon">{icon}</span>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`ui-input ${icon ? "with-icon" : ""}`}
        {...props}
      />
    </div>
  );
}
