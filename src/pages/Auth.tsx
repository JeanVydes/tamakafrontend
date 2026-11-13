import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/Auth";
import { useI18n } from "../i18n/I18n";
import { errorText } from "../lib/format";
import { photos } from "../lib/media";

function AuthShell({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return (
    <main className="auth-page">
      <div className="auth-art" aria-hidden="true">
        <img src={photos.beach} alt="" />
      </div>
      <div className="auth-panel">
        <h1>{title}</h1>
        <p className="muted">{lead}</p>
        {children}
      </div>
    </main>
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
        <label>
          {t("auth.password")}
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
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
      navigate("/perfil", { replace: true });
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
        <label>
          {t("auth.password")}
          <input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} />
          <small>{t("auth.passwordHint")}</small>
        </label>
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
