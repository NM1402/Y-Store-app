import React from "react";

/**
 * Unified Card Component
 * BLOCK V2-11 - Design System
 */
export default function Card({ 
  children, 
  padding = true, 
  hover = false,
  onClick,
  className = "",
  ...props 
}) {
  const baseClass = "ui-card";
  const paddingClass = padding ? "pad" : "";
  const hoverClass = hover ? "hoverable" : "";
  const clickableClass = onClick ? "clickable" : "";
  
  return (
    <div 
      className={`${baseClass} ${paddingClass} ${hoverClass} ${clickableClass} ${className}`.trim()}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}
