// FILE: tailwind.config.ts
// PURPOSE: Tailwind config aligned with the Lovable reference's
//          visual language (shadcn/ui design tokens via CSS
//          variables). Adjusted from the reference for the
//          production repo's tsx/ts paths only.
// CONNECTS TO: src/index.css (where the CSS variables are declared),
//              every component using Tailwind class names.

import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Phase 1251 — Otzar edge-presence motion language. Gentle by
        // design: pulses signal attention, breathing signals activity,
        // shimmer confirms success. All gated behind motion-safe at
        // the call sites so prefers-reduced-motion users get static
        // tints only.
        "edge-pulse": {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "1" },
        },
        "edge-breathe": {
          "0%, 100%": { opacity: "0.35", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.04)" },
        },
        "edge-shimmer": {
          "0%": { opacity: "0" },
          "30%": { opacity: "1" },
          "100%": { opacity: "0.5" },
        },
        // [OTZAR-LIVE-6] Living glass bloom — a slow, low-opacity drift of the
        // ambient color field under the orb glass, for active states only
        // (listening / thinking / success / recommendation). Siri-like, calm;
        // never used for idle/blocked. motion-safe at the call site.
        "bloom-breathe": {
          "0%, 100%": { opacity: "0.65", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.06)" },
        },
        // [OTZAR-LIVE-6] Directional flow trace — a soft streak that sweeps once
        // across the top edge in the direction work moved, then fades. Plays once
        // (not infinite); gated behind motion-safe at the call site.
        "flow-streak-out": {
          "0%": { opacity: "0", transform: "translateX(40%)" },
          "18%": { opacity: "0.9" },
          "100%": { opacity: "0", transform: "translateX(-40%)" },
        },
        "flow-streak-in": {
          "0%": { opacity: "0", transform: "translateX(-40%)" },
          "18%": { opacity: "0.9" },
          "100%": { opacity: "0", transform: "translateX(40%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "edge-pulse": "edge-pulse 2.4s ease-in-out infinite",
        "edge-breathe": "edge-breathe 3.2s ease-in-out infinite",
        "edge-shimmer": "edge-shimmer 1.2s ease-out",
        "bloom-breathe": "bloom-breathe 6s ease-in-out infinite",
        "flow-streak-out": "flow-streak-out 1.8s ease-out",
        "flow-streak-in": "flow-streak-in 1.8s ease-out",
      },
    },
  },
  plugins: [animate],
};

export default config;
