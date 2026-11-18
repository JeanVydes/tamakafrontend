import { Eye, EyeOff, MapPin } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/Auth";
import { useI18n } from "../i18n/I18n";
import { errorText } from "../lib/format";
import { photos } from "../lib/media";
import { passwordStrength } from "../lib/password";

function AuthShell({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <main className="auth-page">
      <div className="auth-art" aria-hidden="true">
        <img src={photos.authArt} alt="" {...{ fetchpriority: "high" }} />
        <div className="auth-art-caption">
          <p className="auth-art-place">
            <MapPin size={15} /> {t("auth.artPlace")}
          </p>
          <p className="auth-art-line">{t("auth.artLine")}</p>
          <span className="auth-art-credit">{t("common.illustrative")}</span>
        </div>
      </div>
      <div className="auth-panel">
        <h1>{title}</h1>
        <p className="muted">{lead}</p>
        {children}
      </div>
    </main>
  );
}

// Campo de contraseña con el «ojito»: alterna entre oculta y visible sin perder el foco ni el cursor.
function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  maxLength,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  minLength?: number;
  maxLength?: number;
  children?: React.ReactNode;
}) {
  const { t } = useI18n();
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-wrap">
        <input
          id={id}
          type={shown ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          maxLength={maxLength}
          spellCheck={false}
          autoCapitalize="none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={shown ? t("auth.hidePassword") : t("auth.showPassword")}
          aria-pressed={shown}
          onClick={() => setShown((s) => !s)}
        >
          {shown ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
      {children}
    </div>
  );
}

// Indicador de seguridad: cuatro tramos y una frase. El color acompaña al texto, nunca lo reemplaza.
function StrengthMeter({ password, name, email }: { password: string; name: string; email: string }) {
  const { t } = useI18n();
  const { level, tip } = passwordStrength(password, { name, email });
  const names = ["", t("auth.strengthWeak"), t("auth.strengthFair"), t("auth.strengthGood"), t("auth.strengthStrong")];
  if (!password) return <small>{t("auth.passwordHint")}</small>;
  return (
    <div className="strength" data-level={level}>
      <div className="strength-bar" role="meter" aria-label={t("auth.strength")} aria-valuemin={1} aria-valuemax={4} aria-valuenow={level} aria-valuetext={names[level]}>
        <span />
        <span />
        <span />
        <span />
      </div>
      <p className="strength-text" aria-live="polite">
        <strong>{names[level]}</strong> · {t(`auth.tip.${tip}`)}
      </p>
    </div>
  );
}

export function Login() {
  const { t } = useI18n();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await login(email.trim(), password);
      // Si venía de una página protegida (?next=) vuelve a ella; si no, aterriza en la portada.
      navigate(params.get("next") || "/", { replace: true });
    } catch (ex) {
      if (ex instanceof ApiError && ex.status === 401) setErr(t("error.loginFailed"));
      else if (ex instanceof ApiError && (ex.status === 403 || ex.status === 409)) setErr(t("auth.suspended"));
      else setErr(errorText(ex, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title={t("auth.loginTitle")} lead={t("auth.loginLead")}>
      <form className="form-stack" onSubmit={submit}>
        <label>
          {t("auth.email")}
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <PasswordField label={t("auth.password")} autoComplete="current-password" value={password} onChange={setPassword} />
        {err && <p className="form-error" role="alert">{err}</p>}
        <button type="submit" className="primary-button block" disabled={busy}>
          {busy ? t("common.loading") : t("auth.submitLogin")}
        </button>
      </form>
      <p className="auth-switch">
        {t("auth.noAccount")} <Link to="/registro">{t("nav.register")}</Link>
      </p>
    </AuthShell>
  );
}

export function Register() {
  const { t } = useI18n();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await register(nombre.trim(), email.trim(), password);
      navigate("/", { replace: true });
    } catch (ex) {
      setErr(ex instanceof ApiError && ex.status === 409 ? t("auth.emailTaken") : errorText(ex, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title={t("auth.registerTitle")} lead={t("auth.registerLead")}>
      <form className="form-stack" onSubmit={submit}>
        <label>
          {t("auth.name")}
          <input autoComplete="name" required maxLength={120} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label>
          {t("auth.email")}
          <input type="email" autoComplete="email" required maxLength={180} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <PasswordField label={t("auth.password")} autoComplete="new-password" minLength={8} maxLength={72} value={password} onChange={setPassword}>
          <StrengthMeter password={password} name={nombre} email={email} />
        </PasswordField>
        {err && <p className="form-error" role="alert">{err}</p>}
        <button type="submit" className="primary-button block" disabled={busy}>
          {busy ? t("common.saving") : t("auth.submitRegister")}
        </button>
      </form>
      <p className="auth-switch">
        {t("auth.haveAccount")} <Link to="/ingresar">{t("nav.login")}</Link>
      </p>
    </AuthShell>
  );
}
