import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Neutralise l'erreur bénigne "ResizeObserver loop ..." qui déclenche l'overlay de dev
const _roeMsg = /ResizeObserver loop (completed with undelivered notifications|limit exceeded)/;
window.addEventListener('error', (e) => {
  if (e && typeof e.message === 'string' && _roeMsg.test(e.message)) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});
const _origError = window.console.error;
window.console.error = (...args) => {
  if (typeof args[0] === 'string' && _roeMsg.test(args[0])) return;
  _origError(...args);
};

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('ServiceWorker registered: ', registration.scope);
      })
      .catch((error) => {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
  // When a new service worker takes control (after an update), reload once
  // so the user immediately gets the latest app instead of a stale cache.
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
