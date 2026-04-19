import React from "react";

/**
 * Unified Badge Component
 * BLOCK V2-11 - Design System
 */
export default function Badge({ 
  children, 
  variant = "default",
  size = "md",
  className = "",
  ...props 
}) {
  return (
    <span 
      className={`ui-badge ${variant} size-${size} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
}
