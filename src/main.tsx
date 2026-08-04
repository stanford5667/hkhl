import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { preloadCommonRoutes } from "./lib/routePreloader";

const CHUNK_RELOAD_KEY = "assetlabs:chunk-reload-attempt";
const CHUNK_RELOAD_WINDOW_MS = 15000;
const REACT_RUNTIME_RELOAD_KEY = "assetlabs:react-runtime-reload-attempt";

const recoverFromStaleReactRuntime = (message: string) => {
  const isStaleReactRuntime =
    message.includes("dispatcher.useState") ||
    message.includes("Cannot read properties of null (reading 'useState')");

  if (!isStaleReactRuntime) return;

  try {
    if (sessionStorage.getItem(REACT_RUNTIME_RELOAD_KEY)) return;
    sessionStorage.setItem(REACT_RUNTIME_RELOAD_KEY, String(Date.now()));
  } catch {
    return;
  }

  const recoveryUrl = new URL(window.location.href);
  recoveryUrl.searchParams.set("runtime-recovery", String(Date.now()));
  window.location.replace(recoveryUrl.toString());
};

if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    recoverFromStaleReactRuntime(event.message);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const message =
      event.reason instanceof Error ? event.reason.message : String(event.reason);
    recoverFromStaleReactRuntime(message);
  });

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();

    const now = Date.now();

    try {
      const previousAttempt = JSON.parse(
        sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? "null",
      ) as { count?: number; timestamp?: number } | null;

      const count = previousAttempt?.count ?? 0;
      const timestamp = previousAttempt?.timestamp ?? 0;
      const isRecentAttempt = now - timestamp < CHUNK_RELOAD_WINDOW_MS;

      if (isRecentAttempt && count >= 1) {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
        console.error("[ChunkRecovery] Preload failed after reload", event);
        return;
      }

      sessionStorage.setItem(
        CHUNK_RELOAD_KEY,
        JSON.stringify({ count: isRecentAttempt ? count + 1 : 1, timestamp: now }),
      );
    } catch {
      sessionStorage.setItem(
        CHUNK_RELOAD_KEY,
        JSON.stringify({ count: 1, timestamp: now }),
      );
    }

    window.location.reload();
  });

  window.addEventListener("pageshow", () => {
    sessionStorage.removeItem(REACT_RUNTIME_RELOAD_KEY);

    try {
      const rawAttempt = sessionStorage.getItem(CHUNK_RELOAD_KEY);
      if (!rawAttempt) return;

      const attempt = JSON.parse(rawAttempt) as { timestamp?: number };
      if (!attempt.timestamp || Date.now() - attempt.timestamp >= CHUNK_RELOAD_WINDOW_MS) {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      }
    } catch {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);

// Preload common routes after initial render is complete
preloadCommonRoutes();
