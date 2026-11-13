import { ArrowRight, BadgeDollarSign, CalendarCheck2, Hourglass, Inbox, PackageOpen, Pencil, Plus, Store, Wallet } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { comercios, indicadores, pagos, reservas, servicios, type ServicioInput } from "../api/endpoints";
import { ApiError } from "../api/http";
import type { Comercio, Reserva, Servicio } from "../api/types";
import { useAuth } from "../auth/Auth";
import { JourneyRail } from "../components/JourneyRail";
import { useToast } from "../components/Toast";
import { Dialog, EmptyState, ErrorState, Loading, PageHeading, PagoPill, Pill, ReservaPill, Segmented } from "../components/ui";
import { useI18n } from "../i18n/I18n";
import { day, errorText, humanize, money } from "../lib/format";
import { useAsync } from "../lib/hooks";
import { useServicio } from "./Reservations";

export function Metric({ icon: Icon, tone = "", label, value }: { icon: typeof Store; tone?: string; label: string; value: string | number }) {
  return (
    <article className="metric">
      <span className={`metric-icon ${tone}`}>
        <Icon />
      </span>
      <small>{label}</small>
      <strong className="num">{value}</strong>
    </article>
  );
}

export function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="bars">
      {rows.map((r) => (
        <li key={r.label}>
          <span className="bar-label">{r.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="bar-value num">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

function useMyComercios() {
  const { cuenta } = useAuth();
  return useAsync(async () => (await comercios.buscar()).filter((c) => c.operadorId === cuenta?.id), [cuenta?.id]);
}

// ---------- Resumen ----------

export function OperatorOverview() {
  const { t, lang } = useI18n();
  const [decision, setDecision] = useState<Decision>(null);
  const data = useAsync(
    () => Promise.all([reservas.operador(), pagos.operador().catch(() => []), indicadores.operador().catch(() => [])]),
    [],
  );
  if (data.loading && !data.data) return <Loading />;
  if (data.error || !data.data) return <ErrorState error={data.error} onRetry={data.reload} />;
  const [res, pays, ind] = data.data;
  const pending = res.filter((r) => r.estado === "PENDIENTE").sort((a, b) => a.creadaEn.localeCompare(b.creadaEn));
  const collected = pays.filter((p) => p.estado === "APROBADO").reduce((s, p) => s + Number(p.monto), 0);

  // Lo primero es lo que espera respuesta: la decisión del operador es el paso que bloquea al viajero.
  return (
    <>
      <PageHeading
        title={t("op.pendingTitle")}
        lead={pending.length === 1 ? t("op.pendingOne") : pending.length ? t("op.pendingCount", { n: pending.length }) : t("op.pendingNone")}
        action={
          <Link to="/operador/solicitudes" className="text-link">
            {t("panel.requests")} <ArrowRight size={16} />
          </Link>
        }
      />
      {pending.length > 0 ? (
        <div className="request-list">
          {pending.slice(0, 4).map((r) => (
            <RequestRow key={r.id} r={r} onDecide={setDecision} />
          ))}
        </div>
      ) : (
        <EmptyState icon={Inbox} title={t("op.pendingNone")} />
      )}

      <h2 className="section-title">{t("panel.summary")}</h2>
      <div className="metric-row">
        <Metric icon={Hourglass} label={t("op.metric.toPay")} value={res.filter((r) => r.estado === "ACEPTADA").length} />
        <Metric icon={CalendarCheck2} tone="green" label={t("op.metric.confirmed")} value={res.filter((r) => r.estado === "CONFIRMADA").length} />
        <Metric icon={Wallet} label={t("op.metric.revenue")} value={money(collected, lang)} />
      </div>
      <Dialog
        open={!!decision}
        title={decision ? t(decision.kind === "accept" ? "op.acceptTitle" : decision.kind === "reject" ? "op.rejectTitle" : "op.cancel", { id: decision.r.id }) : ""}
        onClose={() => setDecision(null)}
      >
        {decision && (
          <DecisionForm
            d={decision}
            onDone={(changed) => {
              setDecision(null);
              if (changed) void data.reload();
            }}
          />
        )}
      </Dialog>
      <section className="data-card padded">
        <h2>{t("op.indicators")}</h2>
        {ind.length === 0 ? <p className="muted">{t("op.indicatorsEmpty")}</p> : <Bars rows={ind.map((c) => ({ label: humanize(c.tipo), value: c.total }))} />}
      </section>
    </>
  );
}

// ---------- Comercios ----------

const emptyBiz = { nombre: "", rnt: "", categoria: "", descripcion: "" };

export function OperatorBusinesses() {
  const { t } = useI18n();
  const toast = useToast();
  const list = useMyComercios();
  const [editing, setEditing] = useState<Comercio | "new" | null>(null);
  const [form, setForm] = useState(emptyBiz);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (editing === "new") setForm(emptyBiz);
    else if (editing) setForm({ nombre: editing.nombre, rnt: editing.rnt, categoria: editing.categoria, descripcion: editing.descripcion ?? "" });
    setErr("");
  }, [editing]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const body = { nombre: form.nombre.trim(), categoria: form.categoria.trim().toUpperCase(), descripcion: form.descripcion.trim() || undefined };
      if (editing === "new") await comercios.crear({ ...body, rnt: form.rnt.trim() });
      else if (editing) await comercios.actualizar(editing.id, body);
      toast(t("common.saved"));
      setEditing(null);
      void list.reload();
    } catch (ex) {
      setErr(ex instanceof ApiError && ex.status === 409 && editing === "new" ? t("op.rntDup") : errorText(ex, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeading
        title={t("panel.businesses")}
        lead={t("op.bizLead")}
        action={
          <button type="button" className="primary-button" onClick={() => setEditing("new")}>
            <Plus size={18} /> {t("op.bizNew")}
          </button>
        }
      />
      <section className="data-card">
        {list.loading ? (
          <Loading />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : !list.data?.length ? (
          <EmptyState icon={Store} title={t("op.bizEmpty")} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("detail.business")}</th>
                  <th>{t("common.category")}</th>
                  <th>RNT</th>
                  <th>{t("common.state")}</th>
                  <th>
                    <span className="sr-only">{t("common.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.nombre}</strong>
                    </td>
                    <td>{humanize(c.categoria)}</td>
                    <td className="num">{c.rnt}</td>
                    <td>
                      <Pill tone={c.activo ? "ok" : "neutral"}>{c.activo ? t("op.active") : t("op.inactive")}</Pill>
                    </td>
                    <td className="row-actions">
                      <Link to={`/operador/servicios?comercio=${c.id}`} className="table-action">
                        {t("panel.services")}
                      </Link>
                      <button type="button" className="table-action" onClick={() => setEditing(c)}>
                        <Pencil size={14} /> {t("common.edit")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="muted small">{t("op.bizNote")}</p>

      {editing && (
        <form className="edit-card" onSubmit={submit}>
          <h2>{editing === "new" ? t("op.bizNew") : t("op.bizEdit")}</h2>
          <div className="form-grid">
            <label>
              {t("common.name")}
              <input required maxLength={150} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </label>
            <label>
              {t("op.rnt")}
              <input required maxLength={50} disabled={editing !== "new"} value={form.rnt} onChange={(e) => setForm({ ...form, rnt: e.target.value })} />
            </label>
            <label>
              {t("common.category")}
              <input required maxLength={60} list="biz-cats" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
              <datalist id="biz-cats">
                {["ALOJAMIENTO", "TOURS", "GASTRONOMIA", "NATURALEZA", "AVENTURA", "TRANSPORTE"].map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label className="span-2">
              {t("common.description")} <span className="muted">({t("common.optional")})</span>
              <textarea maxLength={1000} rows={3} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </label>
          </div>
          {err && <p className="form-error" role="alert">{err}</p>}
          <div className="edit-actions">
            <button type="button" className="secondary-button" onClick={() => setEditing(null)}>
              {t("common.cancel")}
            </button>
            <button type="submit" className="primary-button" disabled={busy}>
              {busy ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </form>
      )}
    </>
  );
}

// ---------- Servicios ----------

const emptySvc = { nombre: "", precioBase: "", minPersonas: "1", maxPersonas: "10" };

export function OperatorServices() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const mine = useMyComercios();
  const selected = Number(params.get("comercio")) || mine.data?.[0]?.id || 0;
  const detail = useAsync(() => (selected ? comercios.obtener(selected) : Promise.resolve(null)), [selected]);
  const [local, setLocal] = useState<Servicio[]>([]);
  const [editing, setEditing] = useState<Servicio | "new" | null>(null);
  const [form, setForm] = useState(emptySvc);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Los servicios desactivados ya no vuelven en el detalle público: se conservan en pantalla durante la sesión.
  useEffect(() => setLocal(detail.data?.servicios ?? []), [detail.data]);
  useEffect(() => {
    if (editing === "new") setForm(emptySvc);
    else if (editing)
      setForm({ nombre: editing.nombre, precioBase: String(editing.precioBase), minPersonas: String(editing.minPersonas), maxPersonas: String(editing.maxPersonas) });
    setErr("");
  }, [editing]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body: ServicioInput = {
      nombre: form.nombre.trim(),
      precioBase: Number(form.precioBase),
      minPersonas: Number(form.minPersonas),
      maxPersonas: Number(form.maxPersonas),
    };
    if (body.maxPersonas < body.minPersonas) return setErr(t("op.rangeError"));
    setBusy(true);
    setErr("");
    try {
      if (editing === "new") {
        const s = await comercios.agregarServicio(selected, body);
        setLocal((l) => [...l, s]);
      } else if (editing) {
        const s = await servicios.actualizar(editing.id, body);
        setLocal((l) => l.map((x) => (x.id === s.id ? s : x)));
      }
      toast(t("common.saved"));
      setEditing(null);
    } catch (ex) {
      setErr(errorText(ex, t));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (s: Servicio) => {
    try {
      const upd = await servicios.cambiarActivo(s.id, !s.activo);
      setLocal((l) => l.map((x) => (x.id === upd.id ? upd : x)));
    } catch (ex) {
      toast(errorText(ex, t), "error");
    }
  };

  if (mine.loading) return <Loading />;
  if (mine.error) return <ErrorState error={mine.error} onRetry={mine.reload} />;
  if (!mine.data?.length)
    return (
      <>
        <PageHeading title={t("panel.services")} lead={t("op.svcLead")} />
        <EmptyState icon={Store} title={t("op.svcNeedBiz")} action={<Link to="/operador/comercios" className="primary-button">{t("op.bizNew")}</Link>} />
      </>
    );

  return (
    <>
      <PageHeading
        title={t("panel.services")}
        lead={t("op.svcLead")}
        action={
          <button type="button" className="primary-button" onClick={() => setEditing("new")}>
            <Plus size={18} /> {t("op.svcNew")}
          </button>
        }
      />
      <label className="inline-select">
        {t("op.svcBusiness")}
        <select value={selected} onChange={(e) => setParams({ comercio: e.target.value }, { replace: true })}>
          {mine.data.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>
      <section className="data-card">
        {detail.loading ? (
          <Loading />
        ) : detail.error ? (
          <ErrorState error={detail.error} onRetry={detail.reload} />
        ) : local.length === 0 ? (
          <EmptyState icon={PackageOpen} title={t("op.svcEmpty")} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("res.service")}</th>
                  <th className="right">{t("op.price")}</th>
                  <th>{t("op.range")}</th>
                  <th>{t("common.state")}</th>
                  <th>
                    <span className="sr-only">{t("common.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {local.map((s) => (
                  <tr key={s.id} className={s.activo ? "" : "dim"}>
                    <td>
                      <strong>{s.nombre}</strong>
                    </td>
                    <td className="num right">{money(s.precioBase, lang)}</td>
                    <td className="num">
                      {s.minPersonas}–{s.maxPersonas}
                    </td>
                    <td>
                      <label className="switch">
                        <input type="checkbox" checked={s.activo} onChange={() => toggle(s)} />
                        <span>{s.activo ? t("op.active") : t("op.inactive")}</span>
                      </label>
                    </td>
                    <td className="row-actions">
                      <button type="button" className="table-action" onClick={() => setEditing(s)}>
                        <Pencil size={14} /> {t("common.edit")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="muted small">{t("op.deactivatedNote")}</p>

      {editing && (
        <form className="edit-card" onSubmit={submit}>
          <h2>{editing === "new" ? t("op.svcNew") : t("op.svcEdit")}</h2>
          <div className="form-grid four">
            <label className="span-2">
              {t("common.name")}
              <input required maxLength={150} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </label>
            <label className="span-2">
              {t("op.price")}
              <input required type="number" min={0} step={1000} value={form.precioBase} onChange={(e) => setForm({ ...form, precioBase: e.target.value })} />
            </label>
            <label>
              {t("op.minP")}
              <input required type="number" min={1} value={form.minPersonas} onChange={(e) => setForm({ ...form, minPersonas: e.target.value })} />
            </label>
            <label>
              {t("op.maxP")}
              <input required type="number" min={1} value={form.maxPersonas} onChange={(e) => setForm({ ...form, maxPersonas: e.target.value })} />
            </label>
          </div>
          {err && <p className="form-error" role="alert">{err}</p>}
          <div className="edit-actions">
            <button type="button" className="secondary-button" onClick={() => setEditing(null)}>
              {t("common.cancel")}
            </button>
            <button type="submit" className="primary-button" disabled={busy}>
              {busy ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </form>
      )}
    </>
  );
}

// ---------- Solicitudes ----------

type Decision = { r: Reserva; kind: "accept" | "reject" | "cancel" } | null;

function RequestRow({ r, compact, onDecide }: { r: Reserva; compact?: boolean; onDecide?: (d: Decision) => void }) {
  const { t, lang } = useI18n();
  const svc = useServicio(r.servicioId);
  return (
    <article className="request-row">
      <div className="request-main">
        <div className="reservation-top">
          <ReservaPill estado={r.estado} />
          <small className="num">{t("res.code", { id: r.id })}</small>
        </div>
        <h3>{svc?.nombre ?? t("res.serviceUnknown", { id: r.servicioId })}</h3>
        <p className="muted">
          {day(r.fechaReserva, lang)} · {r.numeroPersonas === 1 ? t("common.person") : t("common.persons", { n: r.numeroPersonas })}
          {r.valorAPagar !== null && <> · <span className="num">{money(r.valorAPagar, lang)}</span></>}
        </p>
        {!compact && <JourneyRail estado={r.estado} aceptada={r.valorAPagar !== null} pagada={r.estado === "CONFIRMADA" || r.estado === "FINALIZADA"} />}
      </div>
      {onDecide && (
        <div className="request-actions">
          {r.estado === "PENDIENTE" && (
            <>
              <button type="button" className="primary-button" onClick={() => onDecide({ r, kind: "accept" })}>
                {t("op.accept")}
              </button>
              <button type="button" className="secondary-button" onClick={() => onDecide({ r, kind: "reject" })}>
                {t("op.reject")}
              </button>
            </>
          )}
          {(r.estado === "ACEPTADA" || r.estado === "CONFIRMADA") && (
            <button type="button" className="text-danger" onClick={() => onDecide({ r, kind: "cancel" })}>
              {t("op.cancel")}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function DecisionForm({ d, onDone }: { d: NonNullable<Decision>; onDone: (changed: boolean) => void }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const svc = useServicio(d.r.servicioId);
  const suggested = svc ? Number(svc.precioBase) * d.r.numeroPersonas : null;
  const [valor, setValor] = useState("");
  const [obs, setObs] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (suggested !== null && !valor) setValor(String(suggested));
  }, [suggested, valor]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      if (d.kind === "accept") await reservas.responder(d.r.id, { aceptada: true, valorAPagar: Number(valor), observacion: obs || undefined });
      else if (d.kind === "reject") await reservas.responder(d.r.id, { aceptada: false, observacion: obs || undefined });
      else await reservas.cancelarOperador(d.r.id, obs || undefined);
      toast(t("op.done"));
      onDone(true);
    } catch (ex) {
      setErr(errorText(ex, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="dialog-body form-stack" onSubmit={submit}>
      {d.kind === "accept" && (
        <label>
          {t("op.amount")}
          <input type="number" required min={0} step={1000} value={valor} onChange={(e) => setValor(e.target.value)} />
          {suggested !== null && <small>{t("op.amountHint", { v: money(suggested, lang) })}</small>}
        </label>
      )}
      <label>
        {d.kind === "cancel" ? t("op.cancelReason") : t("op.observation")} <span className="muted">({t("common.optional")})</span>
        <textarea rows={3} maxLength={d.kind === "cancel" ? 300 : 500} value={obs} onChange={(e) => setObs(e.target.value)} />
      </label>
      {err && <p className="form-error" role="alert">{err}</p>}
      <div className="dialog-actions">
        <button type="button" className="secondary-button" onClick={() => onDone(false)}>
          {t("common.cancel")}
        </button>
        <button type="submit" className={d.kind === "accept" ? "primary-button" : "danger-button"} disabled={busy}>
          {busy ? t("common.saving") : d.kind === "accept" ? t("op.accept") : d.kind === "reject" ? t("op.reject") : t("op.cancel")}
        </button>
      </div>
    </form>
  );
}

export function OperatorRequests() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"pending" | "active" | "closed">("pending");
  const [decision, setDecision] = useState<Decision>(null);
  const data = useAsync(() => reservas.operador(), []);
  const list = useMemo(() => [...(data.data ?? [])].sort((a, b) => b.creadaEn.localeCompare(a.creadaEn)), [data.data]);
  const groups = {
    pending: list.filter((r) => r.estado === "PENDIENTE"),
    active: list.filter((r) => r.estado === "ACEPTADA" || r.estado === "CONFIRMADA"),
    closed: list.filter((r) => ["RECHAZADA", "CANCELADA", "FINALIZADA"].includes(r.estado)),
  };
  const titles = { accept: "op.acceptTitle", reject: "op.rejectTitle", cancel: "op.cancel" } as const;

  return (
    <>
      <PageHeading title={t("panel.requests")} lead={t("op.reqLead")} />
      <Segmented
        label={t("panel.requests")}
        value={tab}
        onChange={setTab}
        options={[
          { value: "pending", label: t("op.reqTab.pending"), count: groups.pending.length },
          { value: "active", label: t("op.reqTab.active") },
          { value: "closed", label: t("op.reqTab.closed") },
        ]}
      />
      {data.loading ? (
        <Loading />
      ) : data.error ? (
        <ErrorState error={data.error} onRetry={data.reload} />
      ) : groups[tab].length === 0 ? (
        <EmptyState icon={Inbox} title={t("op.reqEmpty")} />
      ) : (
        <div className="request-list">
          {groups[tab].map((r) => (
            <RequestRow key={r.id} r={r} onDecide={setDecision} />
          ))}
        </div>
      )}
      <Dialog open={!!decision} title={decision ? t(titles[decision.kind], { id: decision.r.id }) : ""} onClose={() => setDecision(null)}>
        {decision && (
          <DecisionForm
            d={decision}
            onDone={(changed) => {
              setDecision(null);
              if (changed) void data.reload();
            }}
          />
        )}
      </Dialog>
    </>
  );
}

// ---------- Pagos ----------

export function PaymentsTable({ rows, showParties }: { rows: import("../api/types").PagoDetalle[]; showParties?: boolean }) {
  const { t, lang } = useI18n();
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t("common.reference")}</th>
            <th>{t("panel.bookings")}</th>
            {showParties && <th>{t("ad.tourist")}</th>}
            {showParties && <th>{t("ad.operator")}</th>}
            <th className="right">{t("common.total")}</th>
            <th>{t("common.state")}</th>
            <th>{t("common.date")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td className="num">{p.referenciaPasarela}</td>
              <td className="num">R-{p.reservaId}</td>
              {showParties && <td className="num">#{p.turistaId}</td>}
              {showParties && <td className="num">#{p.operadorId}</td>}
              <td className="num right">{money(p.monto, lang)}</td>
              <td>
                <PagoPill estado={p.estado} />
              </td>
              <td>{day(p.creadoEn, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OperatorPayments() {
  const { t } = useI18n();
  const data = useAsync(() => pagos.operador(), []);
  return (
    <>
      <PageHeading title={t("panel.payments")} lead={t("op.payLead")} />
      <section className="data-card">
        {data.loading ? (
          <Loading />
        ) : data.error ? (
          <ErrorState error={data.error} onRetry={data.reload} />
        ) : !data.data?.length ? (
          <EmptyState icon={BadgeDollarSign} title={t("op.payEmpty")} />
        ) : (
          <PaymentsTable rows={[...data.data].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))} />
        )}
      </section>
    </>
  );
}
