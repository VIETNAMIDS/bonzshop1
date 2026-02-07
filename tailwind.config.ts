import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  safelist: [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
    'bg-pink-500', 'bg-purple-500', 'bg-orange-500', 'bg-cyan-500',
    'bg-emerald-500', 'bg-rose-500', 'bg-indigo-500', 'bg-amber-500',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Space Grotesk Variable', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
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
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
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
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "message-in": {
          "0%": { opacity: "0", transform: "translateY(20px) scale(0.9)" },
          "50%": { transform: "translateY(-5px) scale(1.02)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "float-up": {
          "0%": { opacity: "1", transform: "translateY(0) scale(1)" },
          "100%": { opacity: "0", transform: "translateY(-100px) scale(1.5)" },
        },
        "particle": {
          "0%": { opacity: "1", transform: "translate(0, 0) scale(1)" },
          "100%": { 
            opacity: "0", 
            transform: "translate(calc(var(--velocity-x) * 30px), calc(var(--velocity-y) * 30px)) scale(0)" 
          },
        },
        "firework-particle": {
          "0%": { opacity: "1", transform: "translate(0, 0) scale(1)" },
          "100%": { 
            opacity: "0", 
            transform: "translate(calc(cos(var(--angle)) * 50px), calc(sin(var(--angle)) * 50px)) scale(0)" 
          },
        },
        "confetti-fall": {
          "0%": { opacity: "1", transform: "translateY(0) rotate(0deg)" },
          "100%": { opacity: "0", transform: "translateY(100vh) rotate(720deg)" },
        },
        "sparkle": {
          "0%, 100%": { opacity: "0", transform: "scale(0)" },
          "50%": { opacity: "1", transform: "scale(1)" },
        },
        "bounce-in": {
          "0%": { transform: "scale(0)" },
          "50%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 5px currentColor" },
          "50%": { boxShadow: "0 0 20px currentColor, 0 0 30px currentColor" },
        },
        "wiggle": {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        "rainbow": {
          "0%": { filter: "hue-rotate(0deg)" },
          "100%": { filter: "hue-rotate(360deg)" },
        },
        "progress": {
          "0%": { width: "0%" },
          "100%": { width: "100%" },
        },
        "firework": {
          "0%": { transform: "scale(0)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "slide-in-right": "slide-in-right 0.5s ease-out forwards",
        "scale-in": "scale-in 0.3s ease-out forwards",
        "message-in": "message-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "float-up": "float-up 1.5s ease-out forwards",
        "particle": "particle 1s ease-out forwards",
        "firework-particle": "firework-particle 0.8s ease-out forwards",
        "confetti-fall": "confetti-fall 3s linear forwards",
        "sparkle": "sparkle 0.6s ease-in-out",
        "bounce-in": "bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "pulse-glow": "pulse-glow 1.5s ease-in-out infinite",
        "wiggle": "wiggle 0.3s ease-in-out infinite",
        "rainbow": "rainbow 3s linear infinite",
        "progress": "progress 3s ease-out forwards",
        "firework": "firework 0.5s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
