{
  "app": {
    "name": "Y-Store Telegram Mini App",
    "page": "Product Detail Page (PDP) v3",
    "design_personality": [
      "Premium minimal (iOS-like)",
      "Rozetka-like clarity + strong section rhythm",
      "Wide blocks, generous whitespace",
      "Crisp 2px borders, soft radius",
      "Light mode only"
    ],
    "primary_goal": "Fix overlapping sections by enforcing a strict vertical layout rhythm (32px gaps) and safe sticky bottom actions."
  },

  "layout_and_spacing": {
    "viewport_target": "Mobile-first 393x800 (Telegram Mini App)",
    "global_gutters": {
      "content_padding_x": "20px (mobile)",
      "content_padding_x_large": "24px (>= 393-430px)",
      "max_width": "100% (no narrow centered container)"
    },
    "vertical_rhythm": {
      "section_gap": "32px (CRITICAL)",
      "section_inner_padding": "16-20px",
      "section_border": "2px solid var(--border)",
      "section_radius": "16px",
      "rule": "Never rely on collapsing margins between children; use flex column + gap on the wrapper."
    },

    "required_css_rules": {
      "notes": "These are the exact rules the main agent should implement to stop sections (Delivery/Guarantees/Description/etc.) from overlapping. Use these classnames exactly.",

      "product-v3__content": {
        "intent": "Main content wrapper: enforce vertical stacking and spacing; reserve space for sticky bottom bar.",
        "css": ".product-v3__content {\n  /* Layout */\n  display: flex;\n  flex-direction: column;\n  gap: 32px; /* CRITICAL: section spacing */\n\n  /* Width + gutters */\n  width: 100%;\n  padding-left: 20px;\n  padding-right: 20px;\n  padding-top: 16px;\n\n  /* Reserve space for fixed bottom actions */\n  padding-bottom: calc(120px + env(safe-area-inset-bottom));\n\n  /* Prevent weird overlap from positioned children */\n  position: relative;\n  isolation: isolate;\n\n  /* Ensure long content doesn’t collapse */\n  min-height: 100%;\n  box-sizing: border-box;\n }\n\n@media (min-width: 420px) {\n  .product-v3__content {\n    padding-left: 24px;\n    padding-right: 24px;\n  }\n }"
      },

      "product-v3__section": {
        "intent": "Each section card: stable block formatting context, no overlap, crisp border.",
        "css": ".product-v3__section {\n  display: block;\n  width: 100%;\n\n  /* Card look */\n  background: var(--card);\n  border: 2px solid var(--border);\n  border-radius: 16px;\n\n  /* Inner spacing */\n  padding: 18px 16px;\n\n  /* Prevent children from escaping and overlapping other sections */\n  position: relative;\n  overflow: hidden;\n\n  /* Make sure shadows/borders don’t affect layout */\n  box-sizing: border-box;\n }\n\n@media (min-width: 420px) {\n  .product-v3__section {\n    padding: 20px 18px;\n  }\n }"
      },

      "margins_vs_gap": {
        "rule": "Primary spacing MUST be via .product-v3__content { gap: 32px }. Do not add margin-bottom on sections unless you are supporting legacy markup.",
        "legacy_fallback": ".product-v3__section { margin: 0; }\n.product-v3__section + .product-v3__section { margin-top: 32px; }"
      },

      "sticky_buttons": {
        "intent": "Fixed bottom action bar with safe-area support; must not cover content.",
        "css": ".product-v3__sticky-actions {\n  position: fixed;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  z-index: 60;\n\n  /* Premium iOS-like surface */\n  background: rgba(249, 253, 254, 0.92);\n  backdrop-filter: blur(16px);\n  -webkit-backdrop-filter: blur(16px);\n\n  border-top: 2px solid var(--border);\n\n  padding: 12px 20px;\n  padding-bottom: calc(12px + env(safe-area-inset-bottom));\n\n  box-sizing: border-box;\n }\n\n.product-v3__sticky-actions-inner {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 12px;\n  align-items: center;\n }\n\n@media (min-width: 420px) {\n  .product-v3__sticky-actions {\n    padding-left: 24px;\n    padding-right: 24px;\n  }\n }"
      },

      "telegram_safe_area": {
        "rule": "Always keep bottom padding on content >= sticky bar height. If sticky bar height changes, update padding-bottom accordingly.",
        "recommended_constants": {
          "sticky_bar_height": "~96-112px including safe area",
          "content_padding_bottom": "120px + env(safe-area-inset-bottom)"
        }
      }
    },

    "anti_overlap_checklist": [
      "No section should use position:absolute for layout.",
      "Avoid negative margins between sections.",
      "If any section uses transform, ensure it doesn’t create visual overlap; transforms don’t affect document flow.",
      "If using collapsible/accordion, ensure expanded content stays within .product-v3__section (overflow hidden or visible intentionally)."
    ]
  },

  "color_system": {
    "mode": "light",
    "brand": {
      "primary": "#0EA5A4",
      "primary_hover": "#0B8E8D",
      "primary_soft": "rgba(14,165,164,0.10)",
      "success": "#16A34A",
      "danger": "#DC2626"
    },
    "neutrals": {
      "bg": "#F9FDFE",
      "card": "#FFFFFF",
      "text": "#0F172A",
      "muted_text": "#475569",
      "border": "rgba(15, 23, 42, 0.10)",
      "border_strong": "rgba(15, 23, 42, 0.16)"
    },
    "tokens_css": ":root {\n  --bg: #F9FDFE;\n  --card: #FFFFFF;\n  --text: #0F172A;\n  --muted: #475569;\n  --border: rgba(15, 23, 42, 0.10);\n  --border-strong: rgba(15, 23, 42, 0.16);\n\n  --primary: #0EA5A4;\n  --primary-hover: #0B8E8D;\n  --primary-soft: rgba(14,165,164,0.10);\n\n  --success: #16A34A;\n  --danger: #DC2626;\n\n  --radius-card: 16px;\n  --radius-btn: 12px;\n\n  --shadow-card: 0 10px 30px rgba(15, 23, 42, 0.06);\n }"
  },

  "typography": {
    "font_pairing": {
      "headings": "Space Grotesk (600-700)",
      "body": "Inter (400-600)",
      "fallback": "system-ui, -apple-system, Segoe UI, Roboto"
    },
    "scale": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl",
      "h2": "text-base md:text-lg",
      "body": "text-sm (mobile) / text-base (>=sm)",
      "small": "text-xs"
    },
    "product_specific": {
      "price": "text-2xl font-semibold tracking-tight",
      "old_price": "text-sm line-through text-slate-400",
      "section_title": "text-sm font-semibold text-slate-900"
    }
  },

  "components": {
    "component_path": {
      "buttons": "/app/frontend/src/components/ui/button.jsx",
      "card": "/app/frontend/src/components/ui/card.jsx",
      "badge": "/app/frontend/src/components/ui/badge.jsx",
      "separator": "/app/frontend/src/components/ui/separator.jsx",
      "aspect_ratio": "/app/frontend/src/components/ui/aspect-ratio.jsx",
      "carousel": "/app/frontend/src/components/ui/carousel.jsx",
      "accordion": "/app/frontend/src/components/ui/accordion.jsx",
      "scroll_area": "/app/frontend/src/components/ui/scroll-area.jsx"
    },
    "pdp_sections": {
      "gallery": {
        "structure": "AspectRatio 1/1 + Carousel for swipe; thumbnails optional",
        "notes": "Keep gallery inside its own .product-v3__section to preserve spacing."
      },
      "price_block": {
        "structure": "Row: current price + old price; stock badge on the right",
        "badge": "Use shadcn Badge with success styling for 'В наявності'"
      },
      "delivery": {
        "structure": "Two option cards inside section (Nova Poshta / Самовивіз)",
        "icons": "Lucide: Truck, Store"
      },
      "guarantees": {
        "structure": "3 rows with icon + title + short caption",
        "icons": "Lucide: ShieldCheck, BadgeCheck, RotateCcw"
      },
      "description": {
        "structure": "Rich text inside .product-description; ensure it doesn’t add huge margins that break rhythm",
        "note": "If description contains headings, keep them but avoid extra top margins that visually look like overlap."
      },
      "specifications": {
        "structure": "Key-value rows; use 2-column grid with strong dividers",
        "notes": "Each row should have padding 12-14px and border-bottom 2px solid var(--border)."
      }
    }
  },

  "motion_and_microinteractions": {
    "principles": [
      "Subtle only (premium): 150-220ms",
      "No transition: all (forbidden)",
      "Use opacity/background-color/border-color/shadow transitions"
    ],
    "recommended": {
      "section_hover": "On tap/press (mobile): slight shadow increase; no translateY on large cards",
      "buttons": "active: scale(0.98); focus ring visible",
      "gallery": "swipe inertia via carousel; image fade between slides (150ms)"
    }
  },

  "accessibility": {
    "touch_targets": "Min 44px height for buttons",
    "focus": "Visible focus ring for keyboard users (Telegram desktop/web)",
    "contrast": "All text on white must be >= WCAG AA; muted text still readable"
  },

  "testing_attributes": {
    "rule": "All interactive and key informational elements MUST include data-testid (kebab-case).",
    "required_testids": [
      "pdp-back-button",
      "pdp-gallery-carousel",
      "pdp-price-current",
      "pdp-price-old",
      "pdp-stock-badge",
      "pdp-delivery-nova-poshta-option",
      "pdp-delivery-pickup-option",
      "pdp-guarantee-official",
      "pdp-guarantee-original",
      "pdp-guarantee-returns",
      "pdp-description",
      "pdp-specifications",
      "pdp-sticky-add-to-cart-button",
      "pdp-sticky-buy-now-button"
    ]
  },

  "image_urls": {
    "product_gallery_placeholders": [
      {
        "category": "product",
        "description": "Neutral electronics product photo placeholder (square crop)",
        "url": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80"
      },
      {
        "category": "product",
        "description": "Clean gadget detail shot placeholder",
        "url": "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=1200&q=80"
      },
      {
        "category": "product",
        "description": "Minimal tech accessory placeholder",
        "url": "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=1200&q=80"
      }
    ]
  },

  "instructions_to_main_agent": [
    "Implement the CSS blocks exactly for .product-v3__content, .product-v3__section, and .product-v3__sticky-actions.",
    "Ensure the PDP markup uses: <div className=\"product-v3__content\"> with each section wrapped in <section className=\"product-v3__section\">.",
    "Remove any per-section margin hacks that cause collapsing/overlap; rely on wrapper gap:32px.",
    "Sticky bar must be fixed bottom; content wrapper must have padding-bottom >= 120px + safe-area.",
    "Do not use emojis; use Lucide icons only.",
    "Do not use transition: all anywhere new; keep transitions scoped.",
    "Add data-testid to all interactive elements and key info fields listed above.",
    "If any existing CSS uses absolute positioning for Delivery/Guarantees/Description blocks, refactor to normal flow (flex/grid) inside .product-v3__section."
  ],

  "general_ui_ux_design_guidelines": "<General UI UX Design Guidelines>\n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>"
}
