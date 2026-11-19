// Cliente HTTP del gateway: añade el access token, renueva con el refresh token ante un 401
// (una sola renovación en vuelo) y traduce el ErrorResponse del backend a ApiError.

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface TokenResponse extends Tokens {
  tokenType: string;
  expiresInSeconds: number;
  refreshExpiresInSeconds: number;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details: Record<string, string> = {},
  ) {
    super(message);
  }
}

// En desarrollo VITE_API_BASE_URL queda vacio y las peticiones van a rutas relativas /api,
// que el proxy de Vite reenvia al gateway del backend (TAMAKA_GATEWAY). En produccion
// (.env.production lo deja igualmente vacio) las peticiones tambien van relativas y, a traves
// del rewrite de vercel.json, el edge de Vercel proxea /api al gateway de la EC2
// (http://api.taminaka.com): el navegador nunca ve un origen distinto, DVD no hay mixed content
// ni hace falta CORS en el navegador. Si el API llegare a servirse con TLS en
// https://api.taminaka.com, basta definir VITE_API_BASE_URL=https://api.taminaka.com y quitar
// el rewrite.
const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "").replace(/\/+$/, "");

const STORAGE_KEY = "tamaka.tokens";
type Listener = (tokens: Tokens | null) => void;
const listeners = new Set<Listener>();

function readStored(): Tokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

let tokens: Tokens | null = readStored();

export function getTokens() {
  return tokens;
}

export function setTokens(next: Tokens | null) {
  tokens = next ? { accessToken: next.accessToken, refreshToken: next.refreshToken } : null;
  try {
    if (tokens) localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* almacenamiento bloqueado: la sesión vive solo en memoria */
  }
  listeners.forEach((l) => l(tokens));
}

export function onTokensChange(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Lee el payload del JWT (sin verificar: la verificación la hace cada microservicio). */
export function decodeToken(token: string): { sub?: string; roles?: string[]; exp?: number } {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(part)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return {};
  }
}

let refreshing: Promise<boolean> | null = null;

async function refresh(): Promise<boolean> {
  const current = tokens;
  if (!current?.refreshToken) return false;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: current.refreshToken }),
        });
        if (!res.ok) {
          setTokens(null);
          return false;
        }
        const body = (await res.json()) as TokenResponse;
        setTokens(body);
        return true;
      } catch {
        return false;
      } finally {
        setTimeout(() => (refreshing = null), 0);
      }
    })();
  }
  return refreshing;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

/** Errores expresivos compartidos por api() y apiForm(): 401 dispara refresh y reintento. */
async function sendWithRefresh<T>(send: () => Promise<Response>, auth: boolean): Promise<T> {
  let res: Response;
  try {
    res = await send();
    if (res.status === 401 && auth && tokens && (await refresh())) res = await send();
  } catch {
    throw new ApiError(0, "network");
  }

  if (!res.ok) {
    let message = "";
    let details: Record<string, string> = {};
    try {
      const err = await res.json();
      message = err.message ?? "";
      details = err.details ?? {};
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new ApiError(res.status, message, details);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function api<T>(path: string, { method = "GET", body, auth = true }: RequestOptions = {}): Promise<T> {
  const send = () => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (auth && tokens) headers.Authorization = `Bearer ${tokens.accessToken}`;
    return fetch(`${API_BASE}/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };
  return sendWithRefresh<T>(send, auth);
}

interface FormOptions {
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  formData: FormData;
  auth?: boolean;
}

/** Subida multipart: misma captura de errores y refresh que api(), pero sin forzar Content-Type. */
export async function apiForm<T>(path: string, { method = "POST", formData, auth = true }: FormOptions): Promise<T> {
  const send = () => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (auth && tokens) headers.Authorization = `Bearer ${tokens.accessToken}`;
    return fetch(`${API_BASE}/api${path}`, {
      method,
      headers,
      body: formData,
    });
  };
  return sendWithRefresh<T>(send, auth);
}
