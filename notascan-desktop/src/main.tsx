import React from "react";
import ReactDOM from "react-dom/client";
import { MotionConfig } from "framer-motion";
import "./styles/index.css";
import "./styles/print.css";
import "./styles/institution.css";
import { App } from "./app/App";
import { AuthProvider } from "./app/AuthContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./services/client";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </MotionConfig>
  </React.StrictMode>,
);
