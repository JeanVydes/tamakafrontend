import { CircleAlert, Heart, LoaderCircle, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { EstadoAtractivo, EstadoPago, EstadoReserva, TipoFavorito } from "../api/types";
import { useAuth } from "../auth/Auth";
import { useFavorites } from "../auth/Favorites";
import { useI18n } from "../i18n/I18n";
import { errorText } from "../lib/format";
import { useToast } from "./Toast";

export function Loading({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={20} />
      <span>{label ?? t("common.loading")}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="error-state" role="alert">
      <CircleAlert size={20} />
      <p>{errorText(error, t)}</p>
      {onRetry && (
        <button type="button" className="secondary-button" onClick={onRetry}>
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={22} />
      </span>
      <strong>{title}</strong>
      {hint && <p>{hint}</p>}
      {action}
    </div>
  );
}

export function PageHeading({ title, lead, action }: { title: string; lead?: string; action?: ReactNode }) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {lead && <p>{lead}</p>}
      </div>
      {action}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; count?: number }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={value === o.value ? "active" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count !== undefined && o.count > 0 && <span className="count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

const estadoTone: Record<EstadoAtractivo, string> = { ABIERTO: "ok", RESTRINGIDO: "pending", CERRADO: "warning" };
const reservaTone: Record<EstadoReserva, string> = {
  PENDIENTE: "pending",
  ACEPTADA: "info",
  CONFIRMADA: "ok",
  FINALIZADA: "neutral",
  RECHAZADA: "warning",
  CANCELADA: "warning",
};
const pagoTone: Record<EstadoPago, string> = { PENDIENTE: "pending", APROBADO: "ok", RECHAZADO: "warning", REEMBOLSADO: "neutral" };

export function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span className={`status ${tone}`}>
      <i aria-hidden="true" />
      {children}
    </span>
  );
}

export function EstadoPill({ estado }: { estado: EstadoAtractivo }) {
  const { t } = useI18n();
  return <Pill tone={estadoTone[estado] ?? "neutral"}>{t(`estado.${estado}`)}</Pill>;
}

export function ReservaPill({ estado }: { estado: EstadoReserva }) {
  const { t } = useI18n();
  return <Pill tone={reservaTone[estado] ?? "neutral"}>{t(`reserva.${estado}`)}</Pill>;
}

export function PagoPill({ estado }: { estado: EstadoPago }) {
  const { t } = useI18n();
  return <Pill tone={pagoTone[estado] ?? "neutral"}>{t(`pago.${estado}`)}</Pill>;
}

export function FavButton({ tipo, refId, className = "save-button" }: { tipo: TipoFavorito; refId: number; className?: string }) {
  const { t } = useI18n();
  const { cuenta } = useAuth();
  const fav = useFavorites();
  const toast = useToast();
  const on = fav.isFav(tipo, refId);
  // Con sesión pero sin rol de viajero (un gestor, o un operador en su modo) los favoritos no existen: no se ofrece el corazón.
  if (cuenta && !fav.enabled) return null;
  return (
    <button
      type="button"
      className={on ? `${className} saved` : className}
      aria-pressed={on}
      aria-label={on ? t("card.removeFav") : t("card.saveFav")}
      title={on ? t("card.removeFav") : t("card.saveFav")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!cuenta || !fav.enabled) return toast(t("detail.loginToSave"), "error");
        void fav.toggle(tipo, refId);
      }}
    >
      <Heart size={19} fill={on ? "currentColor" : "none"} />
    </button>
  );
}

/** Diálogo nativo: foco protegido y Escape para decisiones que no deben perderse (aceptar, rechazar, cancelar). */
export function Dialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useI18n();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="dialog" onClose={onClose} onCancel={onClose} aria-labelledby="dialog-title">
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label={t("common.close")}>
          <X size={18} />
        </button>
      </div>
      {open && children}
    </dialog>
  );
}

export function LinkButton({ to, children, variant = "primary" }: { to: string; children: ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <Link to={to} className={variant === "primary" ? "primary-button" : "secondary-button"}>
      {children}
    </Link>
  );
}
