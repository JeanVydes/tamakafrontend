import { ApiError } from "../api/http";
import type { MessageKey } from "../i18n/messages";
import type { Lang } from "../i18n/I18n";

const locale = (lang: Lang) => (lang === "en" ? "en-US" : "es-CO");

export function money(value: number | null | undefined, lang: Lang) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(locale(lang), { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(value),
  );
}

/** Fechas LocalDate del backend ("2026-11-16") sin desplazarlas por zona horaria. */
export function day(iso: string | null | undefined, lang: Lang, opts: Intl.DateTimeFormatOptions = {}) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "short", year: "numeric", ...opts }).format(
    new Date(y, m - 1, d),
  );
}

export function dateTime(iso: string | null | undefined, lang: Lang) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale(lang), { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export function relative(iso: string, lang: Lang) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale(lang), { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return dateTime(iso, lang);
}

/** "PLAYA_TURISTICA" → "Playa turística"-ish: humaniza las categorías libres del backend. */
export function humanize(value: string | null | undefined) {
  if (!value) return "";
  const s = value.replace(/[_-]+/g, " ").trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function todayIso() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

type T = (key: MessageKey, vars?: Record<string, string | number>) => string;

/** Mensaje de error para la persona: nombra el problema y, cuando se puede, cómo seguir. */
export function errorText(err: unknown, t: T) {
  if (err instanceof ApiError) {
    if (err.status === 0) return t("error.network");
    if (err.status === 401) return t("error.unauthorized");
    if (err.status === 403) return t("error.forbidden");
    if (err.status === 404) return t("error.notFound");
    if (err.status === 400) {
      const fields = Object.entries(err.details);
      return fields.length ? fields.map(([k, v]) => `${k}: ${v}`).join(" · ") : err.message || t("error.validation");
    }
    if (err.status === 409) return t("error.conflict", { msg: err.message || "" });
  }
  return t("error.generic");
}
