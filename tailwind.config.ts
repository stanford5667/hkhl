import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        sans: ['Figtree', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Outfit', 'Figtree', 'sans-serif'],
      },

      colors: {
        /* ---- Consolidated brand palette (blue + white only) ---- */
        blue: {
          50: "#EFF6FF", 100: "#DBEAFE", 200: "#BFDBFE", 300: "#93C5FD",
          400: "#60A5FA", 500: "#3B82F6", 600: "#2563EB", 700: "#1D4ED8",
          800: "#1E40AF", 900: "#1E3A8A", 950: "#0C1A3C",
        },
        /* Secondary highlight — charts, sparklines, active glows */
        sky: {
          50: "#EAF7FE", 100: "#D3EFFD", 200: "#A9E0FB", 300: "#7CD2FA",
          400: "#38BDF8", 500: "#22A9E6", 600: "#1B8ABC", 700: "#166F98",
          800: "#135A7B", 900: "#114A65", 950: "#0A2C3D",
        },
        /* Legacy accents folded into the blue system */
        cyan: {
          50: "#EAF7FE", 100: "#D3EFFD", 200: "#A9E0FB", 300: "#7CD2FA",
          400: "#38BDF8", 500: "#22A9E6", 600: "#1B8ABC", 700: "#166F98",
          800: "#135A7B", 900: "#114A65", 950: "#0A2C3D",
        },
        teal: {
          50: "#EAF7FE", 100: "#D3EFFD", 200: "#A9E0FB", 300: "#7CD2FA",
          400: "#38BDF8", 500: "#22A9E6", 600: "#1B8ABC", 700: "#166F98",
          800: "#135A7B", 900: "#114A65", 950: "#0A2C3D",
        },
        indigo: {
          50: "#EFF6FF", 100: "#DBEAFE", 200: "#BFDBFE", 300: "#93C5FD",
          400: "#60A5FA", 500: "#3B82F6", 600: "#2563EB", 700: "#1D4ED8",
          800: "#1E40AF", 900: "#1E3A8A", 950: "#0C1A3C",
        },
        violet: {
          50: "#EFF6FF", 100: "#DBEAFE", 200: "#BFDBFE", 300: "#93C5FD",
          400: "#60A5FA", 500: "#3B82F6", 600: "#2563EB", 700: "#1D4ED8",
          800: "#1E40AF", 900: "#1E3A8A", 950: "#0C1A3C",
        },
        purple: {
          50: "#EFF6FF", 100: "#DBEAFE", 200: "#BFDBFE", 300: "#93C5FD",
          400: "#60A5FA", 500: "#3B82F6", 600: "#2563EB", 700: "#1D4ED8",
          800: "#1E40AF", 900: "#1E3A8A", 950: "#0C1A3C",
        },
        fuchsia: {
          50: "#EFF6FF", 100: "#DBEAFE", 200: "#BFDBFE", 300: "#93C5FD",
          400: "#60A5FA", 500: "#3B82F6", 600: "#2563EB", 700: "#1D4ED8",
          800: "#1E40AF", 900: "#1E3A8A", 950: "#0C1A3C",
        },
        pink: {
          50: "#EFF6FF", 100: "#DBEAFE", 200: "#BFDBFE", 300: "#93C5FD",
          400: "#60A5FA", 500: "#3B82F6", 600: "#2563EB", 700: "#1D4ED8",
          800: "#1E40AF", 900: "#1E3A8A", 950: "#0C1A3C",
        },
        /* Muted, strictly functional status colors */
        emerald: {
          50: "#EAF3EE", 100: "#D6E8DF", 200: "#B2D5C3", 300: "#8CC2A8",
          400: "#5FAE8B", 500: "#4C9A78", 600: "#3E8265", 700: "#33684F",
          800: "#2A5342", 900: "#204034", 950: "#0E1F19",
        },
        green: {
          50: "#EAF3EE", 100: "#D6E8DF", 200: "#B2D5C3", 300: "#8CC2A8",
          400: "#5FAE8B", 500: "#4C9A78", 600: "#3E8265", 700: "#33684F",
          800: "#2A5342", 900: "#204034", 950: "#0E1F19",
        },
        lime: {
          50: "#EAF3EE", 100: "#D6E8DF", 200: "#B2D5C3", 300: "#8CC2A8",
          400: "#5FAE8B", 500: "#4C9A78", 600: "#3E8265", 700: "#33684F",
          800: "#2A5342", 900: "#204034", 950: "#0E1F19",
        },
        amber: {
          50: "#F5EFE4", 100: "#EDE2CD", 200: "#DFCDA8", 300: "#D0B685",
          400: "#C9A567", 500: "#B58B4C", 600: "#97733D", 700: "#785C31",
          800: "#5D4826", 900: "#42331B", 950: "#201A0E",
        },
        yellow: {
          50: "#F5EFE4", 100: "#EDE2CD", 200: "#DFCDA8", 300: "#D0B685",
          400: "#C9A567", 500: "#B58B4C", 600: "#97733D", 700: "#785C31",
          800: "#5D4826", 900: "#42331B", 950: "#201A0E",
        },
        orange: {
          50: "#F6EDE6", 100: "#EDDCCE", 200: "#DFBFA5", 300: "#D0A57F",
          400: "#C58E60", 500: "#B27649", 600: "#94613C", 700: "#764D30",
          800: "#5B3B25", 900: "#40291A", 950: "#20140D",
        },
        red: {
          50: "#F6E9E9", 100: "#EFD8D8", 200: "#E3BBBB", 300: "#DA9A9A",
          400: "#CE7E7E", 500: "#BE6464", 600: "#A05252", 700: "#814242",
          800: "#653434", 900: "#492626", 950: "#21100F",
        },
        rose: {
          50: "#F6E9E9", 100: "#EFD8D8", 200: "#E3BBBB", 300: "#DA9A9A",
          400: "#CE7E7E", 500: "#BE6464", 600: "#A05252", 700: "#814242",
          800: "#653434", 900: "#492626", 950: "#21100F",
        },

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
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          light: "hsl(var(--success-light))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          light: "hsl(var(--warning-light))",
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
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
          "6": "hsl(var(--chart-6))",
        },
        // Semantic Financial Colors
        profit: "hsl(var(--profit))",
        loss: "hsl(var(--loss))",
        // Behavioral Design Colors
        surface: {
          "1": "hsl(var(--surface-1))",
          "2": "hsl(var(--surface-2))",
          "3": "hsl(var(--surface-3))",
          "4": "hsl(var(--surface-4))",
        },
        positive: {
          DEFAULT: "hsl(var(--positive))",
          foreground: "hsl(var(--positive-foreground))",
        },
        negative: {
          DEFAULT: "hsl(var(--negative))",
          foreground: "hsl(var(--negative-foreground))",
        },
        trust: {
          DEFAULT: "hsl(var(--trust))",
          foreground: "hsl(var(--trust-foreground))",
        },
        premium: {
          DEFAULT: "hsl(var(--premium))",
          foreground: "hsl(var(--premium-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'glow': '0 0 40px hsl(217 91% 60% / 0.15)',
        'glow-sm': '0 0 20px hsl(217 91% 60% / 0.1)',
        'card': '0 4px 24px hsl(222 47% 3% / 0.5)',
        'card-hover': '0 8px 32px hsl(222 47% 3% / 0.6)',
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
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(10px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px hsl(217 91% 60% / 0.2)" },
          "50%": { boxShadow: "0 0 40px hsl(217 91% 60% / 0.4)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "bounce-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.5s ease-out forwards",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "slide-in-right": "slide-in-right 0.3s ease-out forwards",
        "scale-in": "scale-in 0.2s ease-out forwards",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "bounce-slow": "bounce-slow 2s ease-in-out infinite",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(217 91% 45%) 100%)',
        'gradient-success': 'linear-gradient(135deg, hsl(160 84% 39%) 0%, hsl(160 84% 29%) 100%)',
        'gradient-card': 'linear-gradient(180deg, hsl(222 47% 10%) 0%, hsl(222 47% 7%) 100%)',
        'shimmer': 'linear-gradient(90deg, transparent 0%, hsl(var(--muted)) 50%, transparent 100%)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
