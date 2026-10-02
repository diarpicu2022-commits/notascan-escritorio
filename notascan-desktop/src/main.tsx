import React from "react";
import ReactDOM from "react-dom/client";
import { MotionConfig } from "framer-motion";
import "./styles/index.css";
import { App } from "./app/App";
import { AuthProvider } from "./app/AuthContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <App />
      </AuthProvider>
    </MotionConfig>
  </React.StrictMode>,
);
