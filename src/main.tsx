// FILE: main.tsx
// PURPOSE: Browser entry point. Mounts <App /> into #root and pulls
//          in the global Tailwind/shadcn stylesheet.
// CONNECTS TO: index.html (#root), src/App.tsx, src/index.css.

import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found in index.html");
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
