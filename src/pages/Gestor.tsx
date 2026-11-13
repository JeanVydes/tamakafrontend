import { CalendarPlus, CalendarX2, ChartNoAxesColumn, Landmark, Megaphone, Pencil, Plus, TriangleAlert } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { atractivos, eventos, indicadores, type EventoInput } from "../api/endpoints";
import type { EstadoAtractivo, Evento } from "../api/types";
import { useAuth } from "../auth/Auth";
import { useToast } from "../components/Toast";
import { EmptyState, ErrorState, Loading, PageHeading, Pill } from "../components/ui";
import { useI18n } from "../i18n/I18n";
import { dateTime, day, errorText, humanize, todayIso } from "../lib/format";
import { useAsync } from "../lib/hooks";
import { Bars } from "./Operator";

const ESTADOS: EstadoAtractivo[] = ["ABIERTO", "RESTRINGIDO", "CERRADO"];

// ---------- Atractivos ----------

export function GestorAttractions() {
  const { t } = useI18n();
  const toast = useToast();
  const list = useAsync(() => atractivos.buscar(), []);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ nombre: "", categoria: "", descripcion: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const changeState = async (id: number, estado: EstadoAtractivo) => {
    try {
      const upd = await atractivos.cambiarEstado(id, estado);
      list.setData((l) => (l ?? []).map((a) => (a.id === upd.id ? upd : a)));
      toast(t("ge.stateChanged"));
    } catch (e) {
      toast(errorText(e, t), "error");
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const a = await atractivos.crear({
        nombre: form.nombre.trim(),
        categoria: form.categoria.trim().toUpperCase(),
        descripcion: form.descripcion.trim() || undefined,
      });
      list.setData((l) => [...(l ?? []), a]);
      setForm({ nombre: "", categoria: "", descripcion: "" });
      setCreating(false);
      toast(t("common.saved"));
    } catch (ex) {
      setErr(errorText(ex, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeading
        title={t("panel.attractions")}
        lead={t("ge.attrLead")}
        action={
          <button type="button" className="primary-button" onClick={() => setCreating(true)}>
            <Plus size={18} /> {t("ge.attrNew")}
          </button>
        }
      />
      {creating && (
        <form className="edit-card" onSubmit={submit}>
          <h2>{t("ge.attrNew")}</h2>
          <div className="form-grid">
            <label>
              {t("common.name")}
              <input required maxLength={150} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </label>
            <label>
              {t("common.category")}
              <input required maxLength={60} list="attr-cats" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
              <datalist id="attr-cats">
                {["PLAYA", "NATURALEZA", "CULTURA", "AREA_PROTEGIDA", "MIRADOR", "HISTORICO"].map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label className="span-2">
              {t("common.description")} <span className="muted">({t("common.optional")})</span>
              <textarea rows={3} maxLength={2000} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </label>
          </div>
          {err && <p className="form-error" role="alert">{err}</p>}
          <div className="edit-actions">
            <button type="button" className="secondary-button" onClick={() => setCreating(false)}>
              {t("common.cancel")}
            </button>
            <button type="submit" className="primary-button" disabled={busy}>
              {busy ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </form>
      )}
      <section className="data-card">
        {list.loading ? (
          <Loading />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : !list.data?.length ? (
          <EmptyState icon={Landmark} title={t("ge.attrEmpty")} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("common.name")}</th>
                  <th>{t("common.category")}</th>
                  <th>{t("common.state")}</th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.nombre}</strong>
                    </td>
                    <td>{humanize(a.categoria)}</td>
                    <td>
                      <div className="state-picker" role="radiogroup" aria-label={`${t("common.state")} · ${a.nombre}`}>
                        {ESTADOS.map((s) => (
                          <button
                            key={s}
                            type="button"
                            role="radio"
                            aria-checked={a.estado === s}
                            className={a.estado === s ? `state-opt on ${s.toLowerCase()}` : "state-opt"}
                            onClick={() => a.estado !== s && changeState(a.id, s)}
                          >
                            {t(`estado.${s}`)}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

// ---------- Alertas ----------

export function GestorAlerts() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const list = useAsync(() => atractivos.buscar(), []);
  const [target, setTarget] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const recent = useAsync(() => (target ? atractivos.obtener(target) : Promise.resolve(null)), [target]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await atractivos.emitirAlerta(Number(target), msg.trim());
      toast(t("ge.alertSent"));
      setMsg("");
      void recent.reload();
    } catch (ex) {
      toast(errorText(ex, t), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeading title={t("panel.alerts")} lead={t("ge.alertsLead")} />
      <div className="two-col">
        <form className="edit-card" onSubmit={submit}>
          <h2>
            <Megaphone size={20} /> {t("ge.alertSend")}
          </h2>
          <div className="form-stack">
            <label>
              {t("ge.alertTarget")}
              <select required value={target} onChange={(e) => setTarget(e.target.value)} disabled={list.loading}>
                <option value="">{t("ge.chooseAttraction")}</option>
                {(list.data ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} · {t(`estado.${a.estado}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("ge.alertMessage")}
              <textarea required rows={4} maxLength={500} value={msg} onChange={(e) => setMsg(e.target.value)} />
              <small>
                {t("ge.alertHint")} <span className="num">{msg.length}/500</span>
              </small>
            </label>
          </div>
          <div className="edit-actions">
            <button type="submit" className="danger-button" disabled={busy || !target || !msg.trim()}>
              <TriangleAlert size={17} /> {busy ? t("common.saving") : t("ge.alertSend")}
            </button>
          </div>
        </form>
        <section className="panel-card">
          <h2>{t("ge.alertRecent")}</h2>
          {!target ? (
            <p className="muted">{t("ge.chooseAttraction")}</p>
          ) : recent.loading ? (
            <Loading />
          ) : !recent.data?.alertasRecientes.length ? (
            <p className="muted">{t("detail.noAlerts")}</p>
          ) : (
            <ul className="alert-list">
              {recent.data.alertasRecientes.map((al) => (
                <li key={al.id}>
                  <TriangleAlert size={18} />
                  <div>
                    <p>{al.mensaje}</p>
                    <time dateTime={al.emitidaEn}>{dateTime(al.emitidaEn, lang)}</time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

// ---------- Eventos ----------

const emptyEv: EventoInput = { titulo: "", descripcion: "", lugar: "", categoria: "", fechaInicio: todayIso(), fechaFin: todayIso() };

export function GestorEvents() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const { has } = useAuth();
  const list = useAsync(() => eventos.listar(), []);
  const [editing, setEditing] = useState<Evento | "new" | null>(null);
  const [form, setForm] = useState<EventoInput>(emptyEv);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const canEdit = has("GESTOR");

  useEffect(() => {
    if (editing === "new") setForm(emptyEv);
    else if (editing)
      setForm({
        titulo: editing.titulo,
        descripcion: editing.descripcion ?? "",
        lugar: editing.lugar,
        categoria: editing.categoria ?? "",
        fechaInicio: editing.fechaInicio,
        fechaFin: editing.fechaFin,
      });
    setErr("");
  }, [editing]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.fechaFin < form.fechaInicio) return setErr(t("ge.dateError"));
    setBusy(true);
    setErr("");
    const body = { ...form, descripcion: form.descripcion?.trim() || undefined, categoria: form.categoria?.trim().toUpperCase() || undefined };
    try {
      if (editing === "new") await eventos.publicar(body);
      else if (editing) await eventos.actualizar(editing.id, body);
      toast(t("common.saved"));
      setEditing(null);
      void list.reload();
    } catch (ex) {
      setErr(errorText(ex, t));
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (ev: Evento) => {
    try {
      const upd = await eventos.desactivar(ev.id);
      list.setData((l) => (l ?? []).map((x) => (x.id === upd.id ? upd : x)));
    } catch (ex) {
      toast(errorText(ex, t), "error");
    }
  };

  return (
    <>
      <PageHeading
        title={t("panel.events")}
        lead={t("ge.evLead")}
        action={
          canEdit && (
            <button type="button" className="primary-button" onClick={() => setEditing("new")}>
              <CalendarPlus size={18} /> {t("ge.evNew")}
            </button>
          )
        }
      />
      {editing && (
        <form className="edit-card" onSubmit={submit}>
          <h2>{editing === "new" ? t("ge.evNew") : t("ge.evEdit")}</h2>
          <div className="form-grid">
            <label>
              {t("common.name")}
              <input required maxLength={150} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </label>
            <label>
              {t("ge.place")}
              <input required maxLength={200} value={form.lugar} onChange={(e) => setForm({ ...form, lugar: e.target.value })} />
            </label>
            <label>
              {t("ge.start")}
              <input required type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} />
            </label>
            <label>
              {t("ge.end")}
              <input required type="date" min={form.fechaInicio} value={form.fechaFin} onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} />
            </label>
            <label>
              {t("common.category")} <span className="muted">({t("common.optional")})</span>
              <input maxLength={60} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
            </label>
            <label className="span-2">
              {t("common.description")} <span className="muted">({t("common.optional")})</span>
              <textarea rows={3} maxLength={2000} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
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
      <section className="data-card">
        {list.loading ? (
          <Loading />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : !list.data?.length ? (
          <EmptyState icon={CalendarX2} title={t("ge.evEmpty")} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("common.name")}</th>
                  <th>{t("ge.place")}</th>
                  <th>{t("detail.eventDates")}</th>
                  <th>{t("common.state")}</th>
                  {canEdit && (
                    <th>
                      <span className="sr-only">{t("common.actions")}</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {[...list.data]
                  .sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio))
                  .map((ev) => (
                    <tr key={ev.id} className={ev.activo ? "" : "dim"}>
                      <td>
                        <strong>{ev.titulo}</strong>
                      </td>
                      <td>{ev.lugar}</td>
                      <td>
                        {day(ev.fechaInicio, lang)} – {day(ev.fechaFin, lang)}
                      </td>
                      <td>
                        <Pill tone={ev.activo ? "ok" : "neutral"}>{ev.activo ? t("op.active") : t("ge.inactive")}</Pill>
                      </td>
                      {canEdit && (
                        <td className="row-actions">
                          <button type="button" className="table-action" onClick={() => setEditing(ev)}>
                            <Pencil size={14} /> {t("common.edit")}
                          </button>
                          {ev.activo && (
                            <button type="button" className="table-action danger" onClick={() => deactivate(ev)}>
                              {t("ge.deactivate")}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

// ---------- Indicadores ----------

export function GestorIndicators() {
  const { t } = useI18n();
  const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const [range, setRange] = useState({ desde: monthAgo, hasta: todayIso() });
  const [applied, setApplied] = useState(range);
  const data = useAsync(() => indicadores.demanda(applied.desde, applied.hasta), [applied.desde, applied.hasta]);

  return (
    <>
      <PageHeading title={t("panel.indicators")} lead={t("ge.indLead")} />
      <form
        className="filter-bar"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(range);
        }}
      >
        <label>
          {t("common.from")}
          <input type="date" required value={range.desde} max={range.hasta} onChange={(e) => setRange({ ...range, desde: e.target.value })} />
        </label>
        <label>
          {t("common.to")}
          <input type="date" required value={range.hasta} min={range.desde} onChange={(e) => setRange({ ...range, hasta: e.target.value })} />
        </label>
        <button type="submit" className="primary-button">
          {t("ge.apply")}
        </button>
      </form>
      <section className="data-card padded">
        {data.loading ? (
          <Loading />
        ) : data.error ? (
          <ErrorState error={data.error} onRetry={data.reload} />
        ) : !data.data?.length ? (
          <EmptyState icon={ChartNoAxesColumn} title={t("ge.indEmpty")} />
        ) : (
          <Bars rows={data.data.map((c) => ({ label: humanize(c.tipo), value: c.total }))} />
        )}
      </section>
    </>
  );
}
