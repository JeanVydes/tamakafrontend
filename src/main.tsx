import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import { createRoot } from "react-dom/client";
import App from "./App";
import { enableResponsiveTables } from "./lib/responsiveTables";
import "./styles.css";

// Sin StrictMode: en desarrollo duplicaría cada consulta y el backend local (10 JVM con poca memoria) lo nota.
createRoot(document.getElementById("root")!).render(<App />);
enableResponsiveTables();
