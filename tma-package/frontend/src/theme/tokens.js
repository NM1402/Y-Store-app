/**
 * Design Tokens - Y-Store V2
 * BLOCK V2-11 - Единая система дизайна
 */

export const colors = {
  primary: "#0A84FF",
  primaryHover: "#0066CC",
  primaryLight: "rgba(10, 132, 255, 0.1)",
  
  success: "#34C759",
  successLight: "rgba(52, 199, 89, 0.1)",
  
  danger: "#FF3B30",
  dangerLight: "rgba(255, 59, 48, 0.1)",
  
  warning: "#FF9500",
  warningLight: "rgba(255, 149, 0, 0.1)",
  
  bg: "#F5F6F8",
  card: "#FFFFFF",
  border: "rgba(0, 0, 0, 0.08)",
  borderHover: "rgba(0, 0, 0, 0.15)",
  
  text: "#111111",
  textSecondary: "rgba(0, 0, 0, 0.65)",
  textMuted: "rgba(0, 0, 0, 0.45)",
  
  white: "#FFFFFF",
  black: "#000000",
};

export const radius = {
  xs: "8px",
  sm: "12px",
  md: "16px",
  lg: "20px",
  xl: "24px",
  full: "999px",
};

export const shadow = {
  card: "0 6px 20px rgba(0, 0, 0, 0.05)",
  cardHover: "0 8px 30px rgba(0, 0, 0, 0.1)",
  dropdown: "0 10px 40px rgba(0, 0, 0, 0.15)",
  modal: "0 20px 60px rgba(0, 0, 0, 0.2)",
};

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  xxl: "24px",
};

export const typography = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
  fontWeightNormal: 400,
  fontWeightMedium: 600,
  fontWeightBold: 900,
  fontWeightBlack: 1000,
};

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
};

export default {
  colors,
  radius,
  shadow,
  spacing,
  typography,
  breakpoints,
};
