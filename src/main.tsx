import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSecuritySuite } from "./lib/security";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Initialize security protections AFTER React has mounted
// Running before mount can break React internals (ReactCurrentBatchConfig)
setTimeout(() => initSecuritySuite(), 0);
