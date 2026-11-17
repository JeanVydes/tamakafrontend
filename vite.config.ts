import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Desarrollo: el proxy reenvía /api al gateway nginx del backend clonado en ../tamakabackend
// (infra/gateway/nginx.conf). Solo el gateway publica puertos: TAMAKA_HTTP_PORT, 80 por defecto
// (.env del backend). Así el navegador ve un solo origen y no hace falta CORS en desarrollo.
// En producción no se usa este proxy: el build toma VITE_API_BASE_URL de .env.production
// (https://api.taminaka.com) y el gateway responde CORS para https://taminaka.com.
declare const process: { env: Record<string, string | undefined> };
// 127.0.0.1 y no "localhost": en Windows "localhost" intenta primero IPv6 (::1) y cada petición tarda segundos.
const gateway = process.env.TAMAKA_GATEWAY ?? "http://127.0.0.1:80";

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
