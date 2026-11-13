import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// El gateway nginx (backend/infra) escucha en http://localhost y no expone CORS:
// en desarrollo Vite reenvía /api al gateway, así el navegador ve un solo origen.
declare const process: { env: Record<string, string | undefined> };
// 127.0.0.1 y no "localhost": en Windows "localhost" intenta primero IPv6 (::1) y cada petición tarda segundos.
const gateway = process.env.TAMAKA_GATEWAY ?? "http://127.0.0.1";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: gateway, changeOrigin: true },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      "/api": { target: gateway, changeOrigin: true },
    },
  },
});
