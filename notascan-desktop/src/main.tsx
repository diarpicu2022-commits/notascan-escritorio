import React from "react";
import ReactDOM from "react-dom/client";
import { MotionConfig } from "framer-motion";
import "./styles/index.css";
import "./styles/print.css";
import "./styles/institution.css";
import "./styles/platform.css";
import "./styles/invitations.css";
import "./styles/desktop.css";
import { App } from "./app/App";
import { AuthProvider } from "./app/AuthContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./services/client";
import { IN_DESKTOP, TitleBar } from "./components/organisms/TitleBar";

// App de escritorio sin bordes de Windows: la barra de título es de la app (paso 6h).
if (IN_DESKTOP) document.documentElement.classList.add("ns-in-desktop");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TitleBar />
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </MotionConfig>
  </React.StrictMode>,
);
