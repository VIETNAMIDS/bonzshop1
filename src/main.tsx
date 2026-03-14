import React from "react";
import { createRoot } from "react-dom/client";
<<<<<<< HEAD
import { HelmetProvider } from "react-helmet-async";
=======
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
import App from "./App.tsx";
import "./index.css";
import { initSecuritySuite } from "./lib/security";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
<<<<<<< HEAD
    <HelmetProvider>
      <App />
    </HelmetProvider>
=======
    <App />
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
  </React.StrictMode>
);

// Initialize security protections AFTER React has mounted
// Running before mount can break React internals (ReactCurrentBatchConfig)
setTimeout(() => initSecuritySuite(), 0);

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed - non-critical
    });
  });
}
