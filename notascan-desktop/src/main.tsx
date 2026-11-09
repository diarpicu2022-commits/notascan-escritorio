import React from "react";
import ReactDOM from "react-dom/client";
import { MotionConfig } from "framer-motion";
import "./styles/fonts.css";
import "./styles/index.css";
import "./styles/print.css";
import "./styles/institution.css";
import "./styles/platform.css";
import "./styles/invitations.css";
import "./styles/desktop.css";
import "./styles/preferences.css";
import "./styles/phone.css";
// Modo oscuro B · Campo marino (anexo 2026-11-08-modo-oscuro.md). Va al final, después de amendments.css (que entra por
// index.css) y de las demás hojas, y solo actúa con data-theme="dark". Lo genera scripts/generar-tema-oscuro.mjs.
import "./styles/theme-dark.css";
import { App } from "./app/App";
import { AuthProvider } from "./app/AuthContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./services/client";
import { IN_DESKTOP, TitleBar } from "./components/organisms/TitleBar";
import { I18nProvider } from "./i18n/I18nProvider";
import { startTheme } from "./lib/theme";

// App de escritorio sin bordes de Windows: la barra de título es de la app (paso 6h).
if (IN_DESKTOP) document.documentElement.classList.add("ns-in-desktop");
// Tema (anexo del modo oscuro, O8): index.html ya lo puso antes del primer pintado. Aquí queda escuchando al sistema.
startTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TitleBar />
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </I18nProvider>
    </MotionConfig>
  </React.StrictMode>,
);
