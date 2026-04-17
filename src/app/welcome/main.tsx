import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../../shared/styles/index.css";
import Welcome from "./Welcome";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <Welcome />
  </StrictMode>
);
