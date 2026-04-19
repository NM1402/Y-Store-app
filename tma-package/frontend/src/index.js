import React from "react";
import ReactDOM from "react-dom/client";
// CSS Order: Tailwind first, then our custom styles
import "@/index.css";                // Tailwind base/components/utilities
import "@/styles/layout-core.css";   // RETAIL LAYOUT CORE v1 - overrides Tailwind
import "@/styles/design-system.css"; // Design system + mobile adaptive
import "@/styles/floating.css";      // FAB specific
import "@/styles/admin-design-system.css"; // Admin panel unified styles
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
