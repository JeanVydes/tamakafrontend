import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { auth, cuentas, preferencias } from "../api/endpoints";
import { decodeToken, getTokens, onTokensChange, setTokens } from "../api/http";
import type { Cuenta, Rol, Sesion } from "../api/types";
import { useI18n } from "../i18n/I18n";

interface AuthValue {
  cuenta: Cuenta | null;
  /** Roles activos del token (en modo viajero no incluye OPERADOR). */
  roles: Rol[];
  ready: boolean;
  has: (rol: Rol) => boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (nombre: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  applySession: (s: Sesion) => void;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

const rolesFromToken = () => {
  const tk = getTokens();
  return tk ? ((decodeToken(tk.accessToken).roles ?? []) as Rol[]) : [];
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setLang } = useI18n();
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [roles, setRoles] = useState<Rol[]>(rolesFromToken);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    if (!getTokens()) {
      setCuenta(null);
      return;
    }
    try {
      setCuenta(await cuentas.me());
    } catch {
      setCuenta(null);
    }
  }, []);

  useEffect(() => {
    reload().finally(() => setReady(true));
    return onTokensChange((tk) => {
      setRoles(rolesFromToken());
      if (!tk) setCuenta(null);
    });
  }, [reload]);

  const syncLanguage = useCallback(async () => {
    if (!rolesFromToken().includes("TURISTA")) return;
    try {
      const p = await preferencias.obtener();
      if (p?.idioma === "es" || p?.idioma === "en") setLang(p.idioma);
    } catch {
      /* sin preferencias guardadas */
    }
  }, [setLang]);

  const login = useCallback(
    async (email: string, password: string) => {
      setTokens(await auth.login(email, password));
      await reload();
      void syncLanguage();
    },
    [reload, syncLanguage],
  );

  const register = useCallback(
    async (nombre: string, email: string, password: string) => {
      await cuentas.registrar({ nombre, email, password });
      await login(email, password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    const tk = getTokens();
    setTokens(null);
    setCuenta(null);
    if (tk) await auth.logout(tk.refreshToken).catch(() => undefined);
  }, []);

  const applySession = useCallback((s: Sesion) => {
    setTokens(s.token);
    setCuenta(s.cuenta);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      cuenta,
      roles,
      ready,
      // Un gestor turístico es personal del destino: su cuenta conserva el rol TURISTA (todas lo reciben al registrarse),
      // pero no usa las funciones de viajero —reservas, favoritos, recomendaciones—, así que la interfaz no se las ofrece.
      has: (rol) => roles.includes(rol) && !(rol === "TURISTA" && roles.includes("GESTOR")),
      login,
      register,
      logout,
      applySession,
      reload,
    }),
    [cuenta, roles, ready, login, register, logout, applySession, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fuera de AuthProvider");
  return ctx;
}
