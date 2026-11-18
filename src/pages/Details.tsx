import { ArrowLeft, BadgeCheck, CalendarDays, MapPin, Search, TriangleAlert, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { atractivos, comercios, eventos, reservas } from "../api/endpoints";
import type { Servicio } from "../api/types";
import { useAuth } from "../auth/Auth";
import { useToast } from "../components/Toast";
import { Dialog, EmptyState, ErrorState, EstadoPill, FavButton, Loading } from "../components/ui";
import { useI18n } from "../i18n/I18n";
import { dateTime, day, errorText, humanize, money, todayIso } from "../lib/format";
import { useAsync } from "../lib/hooks";
import { photoFor } from "../lib/media";

function Back() {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <button type="button" className="back-link" onClick={() => (history.length > 1 ? navigate(-1) : navigate("/explorar"))}>
      <ArrowLeft size={16} /> {t("common.back")}
    </button>
  );
}

function DetailMedia({ src, category, fav }: { src: string; category: string; fav: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <figure className="detail-media">
      <img src={src} alt="" />
      <span className="category-pill">{humanize(category)}</span>
      {fav}
      <figcaption>{t("common.illustrative")}</figcaption>
    </figure>
  );
}

export function AtractivoDetail() {
  const { id = "" } = useParams();
  const { t, lang } = useI18n();
  const { data: a, error, loading, reload } = useAsync(() => atractivos.obtener(id), [id]);
  if (loading) return <main className="shell page"><Loading /></main>;
  if (error || !a) return <main className="shell page"><ErrorState error={error} onRetry={reload} /></main>;

  const note = a.estado === "CERRADO" ? t("detail.closedNote") : a.estado === "RESTRINGIDO" ? t("detail.restrictedNote") : t("detail.openNote");

  return (
    <main className="shell page">
      <Back />
      <div className="detail-layout">
        <div className="detail-main">
          <DetailMedia src={photoFor(`${a.nombre} ${a.categoria}`, a.id)} category={a.categoria} fav={<FavButton tipo="ATRACTIVO" refId={a.id} />} />
          <h1>{a.nombre}</h1>
          <p className="card-meta">
            <MapPin size={16} /> Santa Marta, Magdalena
          </p>
          {a.descripcion && <p className="detail-desc">{a.descripcion}</p>}
          <Link to={`/explorar?tab=comercios&q=${encodeURIComponent(a.nombre)}`} className="primary-button">
            <Search size={18} /> {t("detail.findServices")}
          </Link>
        </div>
        <aside className="detail-side">
          <section className={`panel-card state-card state-${a.estado.toLowerCase()}`}>
            <h2>{t("detail.state")}</h2>
            <EstadoPill estado={a.estado} />
            <p>{note}</p>
          </section>
          <section className="panel-card">
            <h2>{t("detail.alerts")}</h2>
            {a.alertasRecientes.length === 0 ? (
              <p className="muted">{t("detail.noAlerts")}</p>
            ) : (
              <ul className="alert-list">
                {a.alertasRecientes.map((al) => (
                  <li key={al.id}>
                    <span className="alert-icon" aria-hidden="true">
                      <TriangleAlert size={16} />
                    </span>
                    <div>
                      <p>{al.mensaje}</p>
                      <time dateTime={al.emitidaEn}>{dateTime(al.emitidaEn, lang)}</time>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="panel-card">
            <h2>{t("detail.recommendations")}</h2>
            <p className="muted">{t("detail.recoDefault")}</p>
          </section>
        </aside>
      </div>
    </main>
  );
}

function RequestForm({ s, onDone }: { s: Servicio; onDone: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const [fecha, setFecha] = useState(todayIso());
  const [personas, setPersonas] = useState(Math.max(1, s.minPersonas));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await reservas.solicitar({ servicioId: s.id, fechaReserva: fecha, numeroPersonas: personas });
      toast(t("detail.requestSent"));
      onDone();
      navigate("/reservas");
    } catch (ex) {
      setErr(errorText(ex, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="dialog-body form-stack" onSubmit={submit}>
      <p className="muted">{t("detail.requestHelp")}</p>
      <label>
        {t("detail.requestDate")}
        <input type="date" required min={todayIso()} value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </label>
      <label>
        {t("detail.requestPeople")}
        <input type="number" required min={s.minPersonas} max={s.maxPersonas} value={personas} onChange={(e) => setPersonas(Number(e.target.value))} />
        <small>{t("detail.capacity", { min: s.minPersonas, max: s.maxPersonas })}</small>
      </label>
      {err && <p className="form-error" role="alert">{err}</p>}
      <div className="dialog-actions">
        <button type="button" className="secondary-button" onClick={onDone}>
          {t("common.cancel")}
        </button>
        <button type="submit" className="primary-button" disabled={busy}>
          {busy ? t("common.saving") : t("detail.requestSend")}
        </button>
      </div>
    </form>
  );
}

export function ComercioDetail() {
  const { id = "" } = useParams();
  const { t, lang } = useI18n();
  const { cuenta, has } = useAuth();
  const toast = useToast();
  const [booking, setBooking] = useState<Servicio | null>(null);
  const { data: c, error, loading, reload } = useAsync(() => comercios.obtener(id), [id]);
  if (loading) return <main className="shell page"><Loading /></main>;
  if (error || !c) return <main className="shell page"><ErrorState error={error} onRetry={reload} /></main>;

  const book = (s: Servicio) => {
    if (!cuenta || !has("TURISTA")) return toast(t("detail.loginToBook"), "error");
    setBooking(s);
  };

  return (
    <main className="shell page">
      <Back />
      <div className="detail-layout">
        <div className="detail-main">
          <DetailMedia src={photoFor(c.categoria, c.id + 7)} category={c.categoria} fav={<FavButton tipo="COMERCIO" refId={c.id} />} />
          <h1>{c.nombre}</h1>
          <p className="card-meta">
            <BadgeCheck size={16} /> {t("detail.rnt", { rnt: c.rnt })}
          </p>
          {c.descripcion && <p className="detail-desc">{c.descripcion}</p>}
        </div>
        <aside className="detail-side">
          <section className="panel-card">
            <h2>{t("detail.servicesTitle")}</h2>
            {c.servicios.length === 0 ? (
              <p className="muted">{t("detail.noServices")}</p>
            ) : (
              <ul className="service-list">
                {c.servicios.map((s) => (
                  <li key={s.id}>
                    <div className="service-head">
                      <h3>{s.nombre}</h3>
                      <FavButton tipo="SERVICIO" refId={s.id} className="fav-inline" />
                    </div>
                    <dl>
                      <div>
                        <dt>{t("detail.priceFrom")}</dt>
                        <dd className="num">{money(s.precioBase, lang)}</dd>
                      </div>
                      <div>
                        <dt>
                          <Users size={14} />
                        </dt>
                        <dd>{t("detail.capacity", { min: s.minPersonas, max: s.maxPersonas })}</dd>
                      </div>
                    </dl>
                    {(!cuenta || has("TURISTA")) && (
                      <button type="button" className="primary-button" onClick={() => book(s)}>
                        {t("detail.request")}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
      <Dialog open={!!booking} title={booking ? t("detail.requestTitle", { name: booking.nombre }) : ""} onClose={() => setBooking(null)}>
        {booking && <RequestForm s={booking} onDone={() => setBooking(null)} />}
      </Dialog>
    </main>
  );
}

export function EventoDetail() {
  const { id = "" } = useParams();
  const { t, lang } = useI18n();
  const { data: e, error, loading, reload } = useAsync(() => eventos.obtener(id), [id]);
  if (loading) return <main className="shell page"><Loading /></main>;
  if (error || !e) return <main className="shell page"><ErrorState error={error} onRetry={reload} /></main>;
  return (
    <main className="shell page">
      <Back />
      <div className="detail-layout">
        <div className="detail-main">
          <DetailMedia src={photoFor(e.categoria || "evento", e.id + 3)} category={e.categoria || "GENERAL"} fav={<FavButton tipo="EVENTO" refId={e.id} />} />
          <h1>{e.titulo}</h1>
          {e.descripcion && <p className="detail-desc">{e.descripcion}</p>}
        </div>
        <aside className="detail-side">
          <section className="panel-card">
            <dl className="facts">
              <div>
                <dt>
                  <CalendarDays size={16} /> {t("detail.eventDates")}
                </dt>
                <dd>{e.fechaInicio === e.fechaFin ? day(e.fechaInicio, lang) : `${day(e.fechaInicio, lang)} – ${day(e.fechaFin, lang)}`}</dd>
              </div>
              <div>
                <dt>
                  <MapPin size={16} /> {t("detail.eventPlace")}
                </dt>
                <dd>{e.lugar}</dd>
              </div>
            </dl>
          </section>
          {!e.activo && <EmptyState icon={TriangleAlert} title={t("ge.inactive")} />}
        </aside>
      </div>
    </main>
  );
}
