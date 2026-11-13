import { ArrowLeft, LockKeyhole, Store, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { cuentas } from "../api/endpoints";
import type { Rol } from "../api/types";
import { useAuth } from "../auth/Auth";
import { useI18n } from "../i18n/I18n";
import { errorText } from "../lib/format";
import { Header, Logo } from "./Header";
import { useToast } from "./Toast";
import { EmptyState, Loading } from "./ui";

function Footer() {
  const { t } = useI18n();
  return (
    <footer>
      <div className="shell footer-main">
        <div>
          <Logo />
          <p>{t("brand.tagline")}</p>
        </div>
        <div>
          <strong>{t("footer.discover")}</strong>
          <Link to="/explorar">{t("nav.explore")}</Link>
          <Link to="/explorar?tab=eventos">{t("explore.tab.eventos")}</Link>
        </div>
        <div>
          <strong>{t("footer.community")}</strong>
          <Link to="/#responsable">{t("footer.responsible")}</Link>
          <Link to="/perfil#operador">{t("footer.beOperator")}</Link>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>{t("footer.rights", { year: new Date().getFullYear() })}</span>
        <span>{t("footer.photos")}</span>
      </div>
    </footer>
  );
}

export function SiteLayout() {
  const { t } = useI18n();
  return (
    <div className="app">
      <a href="#main" className="skip-link">
        {t("nav.skip")}
      </a>
      <Header />
      <div id="main" tabIndex={-1}>
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

export interface PanelLink {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export function PanelLayout({ title, links }: { title: string; links: PanelLink[] }) {
  const { t } = useI18n();
  return (
    <div className="app">
      <a href="#main" className="skip-link">
        {t("nav.skip")}
      </a>
      <Header />
      <div className="dashboard">
        <aside className="dashboard-nav">
          <div className="dashboard-brand">
            <strong>{title}</strong>
          </div>
          <nav aria-label={title}>
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? "active" : "")}>
                <Icon size={19} /> {label}
              </NavLink>
            ))}
          </nav>
          <Link to="/" className="back-to-site">
            <ArrowLeft size={16} /> {t("panel.backToSite")}
          </Link>
        </aside>
        <main id="main" tabIndex={-1} className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Protege rutas por rol activo del token. Con el rol OPERADOR en modo viajero, ofrece cambiar de modo. */
export function RequireRole({ any, children }: { any: Rol[]; children: ReactNode }) {
  const { ready, cuenta, roles, applySession } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [switching, setSwitching] = useState(false);

  if (!ready) return <Loading />;
  if (!cuenta) return <Navigate to={`/ingresar?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (any.some((r) => roles.includes(r))) return <>{children}</>;

  const needsOperatorMode = any.includes("OPERADOR") && cuenta.roles.includes("OPERADOR");
  return (
    <main className="shell page">
      <EmptyState
        icon={needsOperatorMode ? Store : LockKeyhole}
        title={needsOperatorMode ? t("profile.modeTourist") : t("error.forbidden")}
        action={
          needsOperatorMode ? (
            <button
              type="button"
              className="primary-button"
              disabled={switching}
              onClick={async () => {
                setSwitching(true);
                try {
                  applySession(await cuentas.cambiarModo("OPERADOR"));
                  navigate(location.pathname, { replace: true });
                } catch (e) {
                  toast(errorText(e, t), "error");
                } finally {
                  setSwitching(false);
                }
              }}
            >
              {t("profile.toOperator")}
            </button>
          ) : (
            <Link to="/" className="secondary-button">
              {t("panel.backToSite")}
            </Link>
          )
        }
      />
    </main>
  );
}
