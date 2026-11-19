// Modo dev del API: cuando esta activo, todas las peticiones van a https://dev-api.taminaka.com
// (tunel cloudflared al gateway local de la pila `docker compose up`). Con el apagado, las
// peticiones son mismo-origen /api como siempre (proxy de Vite en desarrollo; rewrite de
// vercel.json en produccion). Se persiste en localStorage y el interruptor del pie recarga la
// pagina al cambiar, para que toda la app quede coherente (la sesion sigue: el refresh contra
// el backend nuevo falla solo y desloguea si los JWT no coinciden, como cualquier 401).
const DEV_KEY = "tamaka.dev";
const DEV_BASE = "https://dev-api.taminaka.com";

export function devModeEnabled(): boolean {
  try {
    return localStorage.getItem(DEV_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDevMode(on: boolean) {
  try {
    if (on) localStorage.setItem(DEV_KEY, "1");
    else localStorage.removeItem(DEV_KEY);
  } catch {
    /* almacenamiento bloqueado: el interruptor no persiste */
  }
}

/** Base absoluta del API cuando el modo dev esta activo. */
export function devApiBase(): string {
  return DEV_BASE;
}
