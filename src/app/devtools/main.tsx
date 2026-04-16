import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../../shared/styles/index.css";
import DevTools from "./DevTools";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <DevTools />
  </StrictMode>
);
