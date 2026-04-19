import React from "react";

/**
 * Unified Button Component
 * BLOCK V2-11 - Design System
 */
export default function Button({
  children,
  variant = "default",
  size = "md",
  onClick,
  disabled = false,
  full = false,
  type = "button",
  icon,
  className = "",
  ...props
}) {
  const baseClass = "ui-btn";
  const variantClass = variant;
  const sizeClass = `size-${size}`;
  const fullClass = full ? "full" : "";
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${variantClass} ${sizeClass} ${fullClass} ${className}`.trim()}
      {...props}
    >
      {icon && <span className="ui-btn-icon">{icon}</span>}
      {children}
    </button>
  );
}
