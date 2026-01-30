import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { preloadCommonRoutes } from "./lib/routePreloader";

createRoot(document.getElementById("root")!).render(<App />);

// Preload common routes after initial render is complete
preloadCommonRoutes();
