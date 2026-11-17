import { CalendarDays, CalendarX2, Clock3, MessageSquareText, ReceiptText, TicketCheck, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { pagos, reservas, servicios } from "../api/endpoints";
import { ApiError } from "../api/http";
import type { Comprobante, Pago, Reserva, Servicio } from "../api/types";
import { JourneyRail } from "../components/JourneyRail";
import { useToast } from "../components/Toast";
import { Dialog, EmptyState, ErrorState, LinkButton, Loading, PageHeading, PagoPill, ReservaPill, Segmented } from "../components/ui";
import { useI18n } from "../i18n/I18n";
import { dateTime, day, errorText, money } from "../lib/format";
import { cached, useAsync } from "../lib/hooks";

export const ACTIVE = ["PENDIENTE", "ACEPTADA", "CONFIRMADA"];

/** Nombre del servicio de una reserva (memorizado: muchas reservas comparten servicio). */
export function useServicio(id: number) {
  const [s, setS] = useState<Servicio | null>(null);
  useEffect(() => {
    let alive = true;
    cached(`svc:${id}`, () => servicios.obtener(id))
      .then((v) => alive && setS(v))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [id]);
  return s;
}

function ReservaCard({ r, pago, onChanged }: { r: Reserva; pago?: Pago; onChanged: () => void }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const svc = useServicio(r.servicioId);
  const [busy, setBusy] = useState<"" | "pay" | "cancel">("");
  const [receipt, setReceipt] = useState<Comprobante | null>(null);

  const pay = async () => {
    setBusy("pay");
    try {
      // Mock de pasarela: el backend aprueba al instante y la reserva pasa a CONFIRMADA por el bus de eventos.
      // Pagos aprende de la aceptación por el bus: justo después de aceptar puede responder 404; se reintenta unos segundos.
      for (let intento = 0; ; intento++) {
        try {
          await pagos.iniciar(r.id);
          break;
        } catch (e) {
          if (e instanceof ApiError && e.status === 404 && intento < 5) {
            await new Promise((res) => setTimeout(res, 1000));
            continue;
          }
          throw e;
        }
      }
      onChanged();
      toast(t("res.paymentDone"));
      // La confirmacion de la reserva viaja por el bus (~segundos): reintenta la recarga.
      window.setTimeout(onChanged, 1200);
      window.setTimeout(onChanged, 3500);
    } catch (e) {
      // Último recurso: el operador acaba de aceptar y el pago aún no se habilita.
      toast(e instanceof ApiError && e.status === 404 ? t("res.payNotReady") : errorText(e, t), "error");
    } finally {
      setBusy("");
    }
  };

  const cancel = async () => {
    if (!window.confirm(t("res.cancelConfirm", { id: r.id }))) return;
    setBusy("cancel");
    try {
      await reservas.cancelar(r.id);
      toast(t("res.cancelled"));
      onChanged();
    } catch (e) {
      toast(errorText(e, t), "error");
    } finally {
      setBusy("");
    }
  };

  const openReceipt = async () => {
    if (!pago) return;
    try {
      setReceipt(await pagos.comprobante(pago.id));
    } catch (e) {
      toast(errorText(e, t), "error");
    }
  };

  const paid = pago?.estado === "APROBADO" || pago?.estado === "REEMBOLSADO";
  const pendingPayment = pago?.estado === "PENDIENTE" ? pago : null;

  return (
    <article className="reservation-card">
      <div className="reservation-top">
        <ReservaPill estado={r.estado} />
        <small className="num">{t("res.code", { id: r.id })}</small>
      </div>
      <h2>{svc?.nombre ?? t("res.serviceUnknown", { id: r.servicioId })}</h2>
      <JourneyRail estado={r.estado} pagada={paid} aceptada={r.valorAPagar !== null} />
      <div className="reservation-data">
        <span>
          <CalendarDays />
          <small>{t("res.date")}</small>
          <strong>{day(r.fechaReserva, lang)}</strong>
        </span>
        <span>
          <UsersRound />
          <small>{t("res.people")}</small>
          <strong>{r.numeroPersonas}</strong>
        </span>
        <span>
          <TicketCheck />
          <small>{r.estado === "CONFIRMADA" || r.estado === "FINALIZADA" ? t("res.amountPaid") : t("res.amount")}</small>
          <strong className="num">{r.valorAPagar !== null ? money(r.valorAPagar, lang) : t("res.amountPending")}</strong>
        </span>
        {r.estado === "ACEPTADA" && r.plazoPago && (
          <span className="deadline">
            <Clock3 />
            <small>{t("res.deadline")}</small>
            <strong>{dateTime(r.plazoPago, lang)}</strong>
          </span>
        )}
      </div>
      {r.observacionOperador && (
        <p className="observation">
          <MessageSquareText size={16} />
          <span>
            <strong>{t("res.observation")}:</strong> {r.observacionOperador}
          </span>
        </p>
      )}
      {pago && <PagoPill estado={pago.estado} />}
      {pendingPayment && r.estado === "ACEPTADA" && (
        <div className="notice">
          <p>{t("res.paymentPending", { ref: pendingPayment.referenciaPasarela })}</p>
          <p className="muted">{t("res.paymentDemo")}</p>
        </div>
      )}
      <div className="reservation-actions">
        {r.estado === "ACEPTADA" && !pendingPayment && (
          <button type="button" className="primary-button" disabled={!!busy} onClick={pay}>
            {busy === "pay" ? t("res.paying") : t("res.pay")}
          </button>
        )}
        {pago?.estado === "APROBADO" && (
          <button type="button" className="secondary-button" onClick={openReceipt}>
            <ReceiptText size={17} /> {t("res.receipt")}
          </button>
        )}
        {ACTIVE.includes(r.estado) && (
          <button type="button" className="text-danger" disabled={!!busy} onClick={cancel}>
            {t("res.cancel")}
          </button>
        )}
      </div>
      <Dialog open={!!receipt} title={t("res.receiptTitle")} onClose={() => setReceipt(null)}>
        {receipt && (
          <dl className="dialog-body facts">
            <div>
              <dt>{t("common.reference")}</dt>
              <dd className="num">{receipt.referenciaPasarela}</dd>
            </div>
            <div>
              <dt>{t("common.total")}</dt>
              <dd className="num">{money(receipt.monto, lang)}</dd>
            </div>
            <div>
              <dt>{t("res.approvedAt")}</dt>
              <dd>{dateTime(receipt.aprobadoEn, lang)}</dd>
            </div>
            <div>
              <dt>{t("common.state")}</dt>
              <dd>
                <PagoPill estado={receipt.estado} />
              </dd>
            </div>
          </dl>
        )}
      </Dialog>
    </article>
  );
}

export function Reservations() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"active" | "history">("active");
  const data = useAsync(() => Promise.all([reservas.mias(), pagos.mios().catch(() => [] as Pago[])]), []);
  const [list, pays] = data.data ?? [[], []];

  const payByReserva = useMemo(() => {
    const m = new Map<number, Pago>();
    // El último pago de cada reserva manda (puede haber un intento rechazado antes).
    [...pays].sort((a, b) => a.id - b.id).forEach((p) => m.set(p.reservaId, p));
    return m;
  }, [pays]);

  const sorted = [...list].sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));
  const active = sorted.filter((r) => ACTIVE.includes(r.estado));
  const history = sorted.filter((r) => !ACTIVE.includes(r.estado));
  const shown = tab === "active" ? active : history;

  return (
    <main className="shell page narrow-page">
      <PageHeading title={t("res.title")} lead={t("res.lead")} />
      <Segmented
        label={t("res.title")}
        value={tab}
        onChange={setTab}
        options={[
          { value: "active", label: t("res.tab.active"), count: active.length },
          { value: "history", label: t("res.tab.history") },
        ]}
      />
      {data.loading ? (
        <Loading />
      ) : data.error ? (
        <ErrorState error={data.error} onRetry={data.reload} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title={tab === "active" ? t("res.empty") : t("res.emptyHistory")}
          action={<LinkButton to="/explorar?tab=comercios">{t("res.emptyCta")}</LinkButton>}
        />
      ) : (
        <div className="reservation-list">
          {shown.map((r) => (
            <ReservaCard key={r.id} r={r} pago={payByReserva.get(r.id)} onChanged={data.reload} />
          ))}
        </div>
      )}
    </main>
  );
}
