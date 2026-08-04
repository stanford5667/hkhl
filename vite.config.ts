import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Lovable's preview server can restart while a browser tab remains open.
    // Never let that tab reuse immutable dependency chunks from an older Vite
    // optimization graph, or React and ReactDOM can load from different graphs
    // and leave React's hook dispatcher null.
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Hooks and the renderer must always resolve to the same React instance.
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    // Pre-bundle React's related entry points as one stable dependency graph.
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
  build: {
    sourcemap: true,
  },
}));
