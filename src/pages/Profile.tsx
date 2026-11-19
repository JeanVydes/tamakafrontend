import { ArrowLeftRight, ArrowRight, Check, Landmark, LayoutDashboard, LogOut, Plus, ShieldCheck, Sparkles, Store, UserRound, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cuentas, preferencias } from "../api/endpoints";
import { ImageUpload } from "../components/ImageUpload";
import type { Preferencias } from "../api/types";
import { useAuth } from "../auth/Auth";
import { Select } from "../components/Select";
import { useToast } from "../components/Toast";
import { Loading, PageHeading, Pill } from "../components/ui";
import { useI18n, type Lang } from "../i18n/I18n";
import { day, errorText, humanize } from "../lib/format";
import { photos } from "../lib/media";

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
        <div className="details-title">
          <span className="card-icon" aria-hidden="true">
            <Sparkles size={20} />
          </span>
          <div>
            <h2>{t("profile.prefs")}</h2>
            <p>{t("profile.prefsLead")}</p>
          </div>
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
      <div className="field prefs-language">
        <span>{t("nav.language")}</span>
        <Select
          ariaLabel={t("nav.language")}
          value={prefs.idioma}
          onChange={(v) => setPrefs({ ...prefs, idioma: v as Lang })}
          options={[
            { value: "es", label: "Español" },
            { value: "en", label: "English" },
          ]}
        />
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
  const { cuenta, roles, applySession, logout, reload } = useAuth();
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

  const hasPanels = cuenta.roles.includes("GESTOR") || cuenta.roles.includes("ADMIN") || ownsOperator;
  // Un gestor turístico no usa las funciones de viajero (ver Auth.has): sin intereses ni rol «Viajero» a la vista.
  const isStaff = cuenta.roles.includes("GESTOR");
  const isTourist = cuenta.roles.includes("TURISTA") && !isStaff;
  const shownRoles = cuenta.roles.filter((r) => !(r === "TURISTA" && isStaff));

  return (
    <main className="shell page narrow-page">
      <PageHeading title={t("profile.title")} lead={t("profile.lead")} />

      <section className="profile-hero" aria-label={cuenta.nombre}>
        <div className="profile-banner" aria-hidden="true">
          <img src={photos.authArt} alt="" />
        </div>
        <div className="profile-hero-body">
          <ImageUpload
            variant="square"
            url={cuenta.imagen}
            onUpload={async (file) => {
              await cuentas.subirFoto(file);
              await reload();
            }}
            onRemove={async () => {
              await cuentas.eliminarFoto();
              await reload();
            }}
          />
          <div className="profile-id">
            <h2>{cuenta.nombre}</h2>
            <p>{cuenta.email}</p>
            <div className="pill-row">
              {shownRoles.map((r) => (
                <Pill key={r} tone="neutral">
                  {t(`nav.space.${r}`)}
                </Pill>
              ))}
              <Pill tone={cuenta.activa ? "ok" : "warning"}>{cuenta.activa ? t("profile.active") : t("profile.suspended")}</Pill>
            </div>
          </div>
          <button
            type="button"
            className="secondary-button profile-logout"
            onClick={async () => {
              await logout();
              navigate("/");
            }}
          >
            <LogOut size={17} /> {t("nav.logout")}
          </button>
        </div>
        <dl className="profile-stats">
          <div>
            <dt>{t("profile.memberSince")}</dt>
            <dd>{day(cuenta.creadaEn, lang, { day: undefined })}</dd>
          </div>
          <div>
            <dt>{t("profile.currentMode")}</dt>
            <dd>{t(`nav.space.${isOperatorMode ? "OPERADOR" : cuenta.roles.includes("ADMIN") ? "ADMIN" : isStaff ? "GESTOR" : "TURISTA"}`)}</dd>
          </div>
        </dl>
      </section>

      <div className={isTourist ? "profile-grid" : "profile-grid single"}>
        {isTourist && <PreferencesCard />}

        <div className="profile-side">
          {/* Habilitar el modo operador es para viajeros: a un gestor turístico no se le ofrece. */}
          {(ownsOperator || !isStaff) && (
          <section className="details-card" id="operador">
            {ownsOperator ? (
              <>
                <div className="details-header">
                  <div className="details-title">
                    <span className="card-icon" aria-hidden="true">
                      <ArrowLeftRight size={20} />
                    </span>
                    <div>
                      <h2>{t("profile.modes")}</h2>
                      <p>{isOperatorMode ? t("profile.modeOperator") : t("profile.modeTourist")}</p>
                    </div>
                  </div>
                </div>
                <div className="mode-switch">
                  <button type="button" className={!isOperatorMode ? "mode on" : "mode"} disabled={busy || !isOperatorMode} onClick={() => switchMode("TURISTA")}>
                    <UserRound size={20} /> <span>{t("nav.space.TURISTA")}</span>
                    {!isOperatorMode && <Check size={17} aria-label={t("nav.current")} />}
                  </button>
                  <button type="button" className={isOperatorMode ? "mode on" : "mode"} disabled={busy || isOperatorMode} onClick={() => switchMode("OPERADOR")}>
                    <Store size={20} /> <span>{t("nav.space.OPERADOR")}</span>
                    {isOperatorMode && <Check size={17} aria-label={t("nav.current")} />}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="details-header">
                  <div className="details-title">
                    <span className="card-icon" aria-hidden="true">
                      <Store size={20} />
                    </span>
                    <div>
                      <h2>{t("profile.operatorTitle")}</h2>
                      <p>{t("profile.operatorLead")}</p>
                    </div>
                  </div>
                </div>
                <div className="operator-invite">
                  <p className="muted">{t("profile.operatorSteps")}</p>
                  <button type="button" className="primary-button" disabled={busy} onClick={enableOperator}>
                    {t("profile.operatorEnable")}
                  </button>
                </div>
              </>
            )}
          </section>
          )}

          {hasPanels && (
            <section className="details-card">
              <div className="details-header">
                <div className="details-title">
                  <span className="card-icon" aria-hidden="true">
                    <LayoutDashboard size={20} />
                  </span>
                  <div>
                    <h2>{t("profile.panels")}</h2>
                  </div>
                </div>
              </div>
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
