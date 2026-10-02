import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Puerto fijo: Tauri lo espera en devUrl (src-tauri/tauri.conf.json).
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  envPrefix: ["VITE_", "TAURI_"],
});
