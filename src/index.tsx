import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Ensure DOM is ready (important for extensions & content injection)
const mount = () => {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    console.error("ChartBuddy: root element not found");
    return;
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
