import { ArrowRight, Landmark, LogOut, Plus, ShieldCheck, Store, UserRound, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cuentas, preferencias } from "../api/endpoints";
import type { Preferencias } from "../api/types";
import { useAuth } from "../auth/Auth";
import { useToast } from "../components/Toast";
import { Loading, PageHeading, Pill } from "../components/ui";
import { useI18n, type Lang } from "../i18n/I18n";
import { day, errorText, humanize, initials } from "../lib/format";

const SUGGESTED = ["PLAYA", "NATURALEZA", "CULTURA", "AVENTURA", "GASTRONOMIA", "TOURS"];

function PreferencesCard() {
  const { t, setLang } = useI18n();
  const toast = useToast();
  const [prefs, setPrefs] = useState<Preferencias | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    preferencias
      .obtener()
      .then((p) => setPrefs({ categorias: p?.categorias ?? [], idioma: p?.idioma === "en" ? "en" : "es" }))
      .catch(() => setPrefs({ categorias: [], idioma: "es" }));
  }, []);

  if (!prefs) return <Loading />;

  const toggle = (c: string) =>
    setPrefs({ ...prefs, categorias: prefs.categorias.includes(c) ? prefs.categorias.filter((x) => x !== c) : [...prefs.categorias, c].slice(0, 20) });

  const add = (e: FormEvent) => {
    e.preventDefault();
    const v = draft.trim().toUpperCase().replace(/\s+/g, "_");
    if (v && !prefs.categorias.includes(v)) toggle(v);
    setDraft("");
  };

  const save = async () => {
    setBusy(true);
    try {
      const saved = await preferencias.actualizar(prefs);
      setLang(saved.idioma as Lang);
      toast(t("profile.prefsSaved"));
    } catch (e) {
      toast(errorText(e, t), "error");
    } finally {
      setBusy(false);
    }
  };

  const options = [...new Set([...SUGGESTED, ...prefs.categorias])];

  return (
    <section className="details-card" id="intereses">
      <div className="details-header">
        <div>
          <h2>{t("profile.prefs")}</h2>
          <p>{t("profile.prefsLead")}</p>
        </div>
      </div>
      <div className="chip-list">
        {options.map((c) => (
          <button key={c} type="button" className={prefs.categorias.includes(c) ? "chip on" : "chip"} aria-pressed={prefs.categorias.includes(c)} onClick={() => toggle(c)}>
            {humanize(c)}
            {prefs.categorias.includes(c) && <X size={14} />}
          </button>
        ))}
      </div>
      <form className="inline-form" onSubmit={add}>
        <input value={draft} maxLength={60} onChange={(e) => setDraft(e.target.value)} placeholder={t("profile.categoryPlaceholder")} aria-label={t("profile.addCategory")} />
        <button type="submit" className="secondary-button">
          <Plus size={16} /> {t("profile.addCategory")}
        </button>
      </form>
      <div className="form-grid">
        <label>
          {t("nav.language")}
          <select value={prefs.idioma} onChange={(e) => setPrefs({ ...prefs, idioma: e.target.value as Lang })}>
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </label>
      </div>
      <div className="edit-actions">
        <button type="button" className="primary-button" disabled={busy} onClick={save}>
          {busy ? t("common.saving") : t("common.save")}
        </button>
      </div>
    </section>
  );
}

export function Profile() {
  const { t, lang } = useI18n();
  const { cuenta, roles, applySession, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash, cuenta]);

  if (!cuenta) return <Loading />;
  const isOperatorMode = roles.includes("OPERADOR");
  const ownsOperator = cuenta.roles.includes("OPERADOR");

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast(errorText(e, t), "error");
    } finally {
      setBusy(false);
    }
  };

  const enableOperator = () =>
    run(async () => {
      applySession(await cuentas.habilitarOperador());
      toast(t("profile.operatorEnabled"));
      navigate("/operador/comercios");
    });

  const switchMode = (modo: "TURISTA" | "OPERADOR") =>
    run(async () => {
      applySession(await cuentas.cambiarModo(modo));
      if (modo === "OPERADOR") navigate("/operador");
    });

  return (
    <main className="shell page narrow-page">
      <PageHeading title={t("profile.title")} lead={t("profile.lead")} />
      <div className="profile-layout">
        <aside className="profile-card">
          <div className="large-avatar" aria-hidden="true">
            {initials(cuenta.nombre)}
          </div>
          <h2>{cuenta.nombre}</h2>
          <p>{t("profile.since", { date: day(cuenta.creadaEn, lang, { day: undefined }) })}</p>
          <Pill tone={cuenta.activa ? "ok" : "warning"}>{cuenta.activa ? t("profile.active") : t("profile.suspended")}</Pill>
          <button
            type="button"
            className="secondary-button block"
            onClick={async () => {
              await logout();
              navigate("/");
            }}
          >
            <LogOut size={17} /> {t("nav.logout")}
          </button>
        </aside>

        <div className="profile-main">
          <section className="details-card">
            <div className="details-header">
              <h2>{t("profile.info")}</h2>
            </div>
            <dl className="facts two">
              <div>
                <dt>{t("common.name")}</dt>
                <dd>{cuenta.nombre}</dd>
              </div>
              <div>
                <dt>{t("common.email")}</dt>
                <dd>{cuenta.email}</dd>
              </div>
              <div>
                <dt>{t("profile.roles")}</dt>
                <dd className="pill-row">
                  {cuenta.roles.map((r) => (
                    <Pill key={r} tone="neutral">
                      {t(`nav.space.${r}`)}
                    </Pill>
                  ))}
                </dd>
              </div>
              <div>
                <dt>{t("common.state")}</dt>
                <dd>{cuenta.activa ? t("profile.active") : t("profile.suspended")}</dd>
              </div>
            </dl>
          </section>

          {cuenta.roles.includes("TURISTA") && <PreferencesCard />}

          <section className="details-card" id="operador">
            {ownsOperator ? (
              <>
                <div className="details-header">
                  <div>
                    <h2>{t("profile.modes")}</h2>
                    <p>{isOperatorMode ? t("profile.modeOperator") : t("profile.modeTourist")}</p>
                  </div>
                </div>
                <div className="mode-switch">
                  <button type="button" className={!isOperatorMode ? "mode on" : "mode"} disabled={busy || !isOperatorMode} onClick={() => switchMode("TURISTA")}>
                    <UserRound size={20} /> {t("nav.space.TURISTA")}
                  </button>
                  <button type="button" className={isOperatorMode ? "mode on" : "mode"} disabled={busy || isOperatorMode} onClick={() => switchMode("OPERADOR")}>
                    <Store size={20} /> {t("nav.space.OPERADOR")}
                  </button>
                </div>
              </>
            ) : (
              <div className="operator-invite">
                <span className="metric-icon coral">
                  <Store />
                </span>
                <div>
                  <h2>{t("profile.operatorTitle")}</h2>
                  <p>{t("profile.operatorLead")}</p>
                  <p className="muted">{t("profile.operatorSteps")}</p>
                  <button type="button" className="primary-button" disabled={busy} onClick={enableOperator}>
                    {t("profile.operatorEnable")}
                  </button>
                </div>
              </div>
            )}
          </section>

          {(cuenta.roles.includes("GESTOR") || cuenta.roles.includes("ADMIN") || ownsOperator) && (
            <section className="details-card">
              <h2>{t("profile.panels")}</h2>
              <div className="panel-links">
                {ownsOperator && (
                  <Link to="/operador">
                    <Store size={18} /> {t("panel.operator")} <ArrowRight size={16} />
                  </Link>
                )}
                {cuenta.roles.includes("GESTOR") && (
                  <Link to="/gestor">
                    <Landmark size={18} /> {t("panel.gestor")} <ArrowRight size={16} />
                  </Link>
                )}
                {cuenta.roles.includes("ADMIN") && (
                  <Link to="/admin">
                    <ShieldCheck size={18} /> {t("panel.admin")} <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
