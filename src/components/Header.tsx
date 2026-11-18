import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Compass,
  Heart,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  Store,
  UserCog,
  UserRound,
  X,
  Landmark,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { cuentas, notificaciones, preferencias } from "../api/endpoints";
import type { Rol } from "../api/types";
import { useAuth } from "../auth/Auth";
import { useI18n, type Lang } from "../i18n/I18n";
import { errorText, initials } from "../lib/format";
import { LogoMark } from "./LogoMark";
import { useToast } from "./Toast";

export const NOTIF_EVENT = "tamaka:notificaciones";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="logo" aria-label="TAMAKA">
      <span className="logo-mark" aria-hidden="true">
        <LogoMark />
      </span>
      <span>TAMAKA</span>
    </Link>
  );
}

function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  const { has } = useAuth();
  const choose = async (next: Lang) => {
    if (next === lang) return;
    setLang(next);
    if (!has("TURISTA")) return;
    try {
      const p = await preferencias.obtener();
      await preferencias.actualizar({ categorias: p?.categorias ?? [], idioma: next });
    } catch {
      /* la interfaz cambia igual; la preferencia se guardará la próxima vez */
    }
  };
  return (
    <div className="lang-toggle" role="group" aria-label={t("nav.language")}>
      {(["es", "en"] as Lang[]).map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} className={lang === l ? "on" : ""} onClick={() => choose(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function useUnread(enabled: boolean) {
  const [count, setCount] = useState(0);
  const load = useCallback(async () => {
    if (!enabled) return setCount(0);
    try {
      const list = await notificaciones.listar();
      setCount(list.filter((n) => !n.leida).length);
    } catch {
      /* el contador no es crítico */
    }
  }, [enabled]);
  useEffect(() => {
    void load();
    if (!enabled) return;
    const id = setInterval(load, 60_000);
    window.addEventListener(NOTIF_EVENT, load);
    return () => {
      clearInterval(id);
      window.removeEventListener(NOTIF_EVENT, load);
    };
  }, [enabled, load]);
  return count;
}

const spaceIcon: Record<Rol, typeof UserRound> = { TURISTA: UserRound, OPERADOR: Store, GESTOR: Landmark, ADMIN: ShieldCheck };

function ProfileMenu() {
  const { cuenta, roles, logout, applySession } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!cuenta) return null;
  const owned = cuenta.roles;
  // Espacio en el que se está: el modo operador manda; si no, el del panel que se visita (un administrador que también es
  // gestor ve «Administrador» en /admin y «Gestor turístico» en /gestor); fuera de un panel, el de mayor rango.
  const current: Rol = roles.includes("OPERADOR")
    ? "OPERADOR"
    : location.pathname.startsWith("/gestor") && owned.includes("GESTOR")
      ? "GESTOR"
      : location.pathname.startsWith("/admin") && owned.includes("ADMIN")
        ? "ADMIN"
        : owned.includes("ADMIN")
          ? "ADMIN"
          : owned.includes("GESTOR")
            ? "GESTOR"
            : "TURISTA";

  const goSpace = async (rol: Rol) => {
    setOpen(false);
    try {
      if (rol === "TURISTA") {
        if (cuenta.modoOperador) applySession(await cuentas.cambiarModo("TURISTA"));
        navigate("/");
      } else if (rol === "OPERADOR") {
        if (!cuenta.modoOperador) applySession(await cuentas.cambiarModo("OPERADOR"));
        navigate("/operador");
      } else if (rol === "GESTOR") navigate("/gestor");
      else navigate("/admin");
    } catch (e) {
      toast(errorText(e, t), "error");
    }
  };

  // Un gestor no tiene espacio de viajero (ver Auth.has): su lista solo trae los espacios de trabajo.
  const spaces = (["TURISTA", "OPERADOR", "GESTOR", "ADMIN"] as Rol[]).filter((r) => owned.includes(r) && !(r === "TURISTA" && owned.includes("GESTOR")));

  return (
    <div className="profile-menu" ref={ref}>
      <button type="button" className="profile-trigger" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}>
        <span className="avatar" aria-hidden="true">
          {initials(cuenta.nombre)}
        </span>
        <span className="profile-copy">
          <strong>{cuenta.nombre}</strong>
          <small>{t(`nav.space.${current}`)}</small>
        </span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="profile-dropdown" role="menu">
          <div className="menu-identity">
            <span className="avatar lg" aria-hidden="true">
              {initials(cuenta.nombre)}
            </span>
            <span className="menu-identity-copy">
              <strong>{cuenta.nombre}</strong>
              <small>{cuenta.email}</small>
            </span>
          </div>

          {/* Con un solo espacio no hay nada que cambiar: la lista solo aparece si la cuenta tiene más de uno. */}
          {spaces.length > 1 && (
            <>
              <hr className="menu-rule" />
              <p className="menu-label" id="menu-spaces">
                {t("nav.spaces")}
              </p>
              <div role="group" aria-labelledby="menu-spaces">
                {spaces.map((rol) => {
                  const Icon = spaceIcon[rol];
                  const selected = (rol === "TURISTA" || rol === "OPERADOR") && rol === current;
                  return (
                    <button key={rol} type="button" role="menuitem" className={selected ? "menu-item selected" : "menu-item"} onClick={() => goSpace(rol)}>
                      <Icon size={18} />
                      <span>{t(`nav.space.${rol}`)}</span>
                      {selected && <Check size={16} aria-label={t("nav.current")} />}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <hr className="menu-rule" />
          <Link to="/perfil" role="menuitem" className="menu-item" onClick={() => setOpen(false)}>
            <UserCog size={18} />
            <span>{t("nav.profile")}</span>
          </Link>

          {/* La invitación a ser operador es para viajeros: un gestor turístico es personal del destino y no la ve. */}
          {!owned.includes("OPERADOR") && !owned.includes("GESTOR") && (
            <Link to="/perfil#operador" role="menuitem" className="menu-cta" onClick={() => setOpen(false)}>
              <span className="menu-cta-icon" aria-hidden="true">
                <Store size={18} />
              </span>
              <span className="menu-cta-copy">
                <strong>{t("nav.enableOperator")}</strong>
                <small>{t("nav.enableOperatorHint")}</small>
              </span>
            </Link>
          )}

          <hr className="menu-rule" />
          <button
            type="button"
            role="menuitem"
            className="menu-item quiet"
            onClick={async () => {
              setOpen(false);
              await logout();
              navigate("/");
            }}
          >
            <LogOut size={18} />
            <span>{t("nav.logout")}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { cuenta, has } = useAuth();
  const { t } = useI18n();
  const [mobile, setMobile] = useState(false);
  const location = useLocation();
  const unread = useUnread(!!cuenta);
  // Los enlaces por rol solo aparecen con la cuenta cargada: un token guardado sin cuenta no es una sesión.
  const can = (rol: Parameters<typeof has>[0]) => !!cuenta && has(rol);
  const tourist = can("TURISTA");

  useEffect(() => setMobile(false), [location.pathname]);

  const links = [
    { to: "/operador", label: t("panel.operator"), icon: Store, show: can("OPERADOR") },
    { to: "/gestor", label: t("panel.gestor"), icon: Landmark, show: can("GESTOR") && !can("ADMIN") },
    { to: "/admin", label: t("panel.admin"), icon: ShieldCheck, show: can("ADMIN") },
    { to: "/explorar", label: t("nav.explore"), icon: Compass, show: true },
    { to: "/reservas", label: t("nav.reservations"), icon: CalendarDays, show: tourist && !can("OPERADOR") },
    { to: "/favoritos", label: t("nav.favorites"), icon: Heart, show: tourist && !can("OPERADOR") },
    { to: "/recomendaciones", label: t("nav.recommendations"), icon: Sparkles, show: tourist && !can("OPERADOR") },
  ].filter((l) => l.show);

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Logo />
        <nav id="main-nav" className={mobile ? "nav-links nav-open" : "nav-links"} aria-label={t("nav.main")}>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              <Icon size={17} /> {label}
            </NavLink>
          ))}
          {!cuenta && (
            <div className="nav-auth-mobile">
              <Link to="/ingresar" className="secondary-button">
                {t("nav.login")}
              </Link>
              <Link to="/registro" className="secondary-button">
                {t("nav.register")}
              </Link>
            </div>
          )}
          {/* En el teléfono el selector de idioma vive en este menú, no en la barra, que queda con logo, campana, avatar y menú. */}
          <div className="nav-lang">
            <span>{t("nav.language")}</span>
            <LanguageToggle />
          </div>
        </nav>
        <div className="header-actions">
          <div className="lang-desktop">
            <LanguageToggle />
          </div>
          {cuenta ? (
            <>
              <Link
                to="/notificaciones"
                className="icon-button notification"
                aria-label={unread ? `${t("nav.notifications")} · ${t("notif.unreadCount", { n: unread })}` : t("nav.notifications")}
              >
                <Bell size={19} />
                {unread > 0 && <span className="badge">{unread > 9 ? "9+" : unread}</span>}
              </Link>
              <ProfileMenu />
            </>
          ) : (
            <div className="header-auth">
              <Link to="/ingresar" className="nav-link">
                {t("nav.login")}
              </Link>
              <Link to="/registro" className="secondary-button small">
                {t("nav.register")}
              </Link>
            </div>
          )}
          <button
            type="button"
            className="mobile-toggle"
            aria-expanded={mobile}
            aria-controls="main-nav"
            aria-label={mobile ? t("nav.closeMenu") : t("nav.openMenu")}
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
