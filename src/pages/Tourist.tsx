import { BellOff, CheckCheck, HeartOff, Lightbulb, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { atractivos, comercios, eventos, notificaciones, preferencias, recomendaciones, servicios } from "../api/endpoints";
import type { Atractivo, Comercio, Evento, Favorito, Servicio, TipoFavorito } from "../api/types";
import { useFavorites } from "../auth/Favorites";
import { AtractivoCard, ComercioCard, EventoCard } from "../components/Cards";
import { NOTIF_EVENT } from "../components/Header";
import { useToast } from "../components/Toast";
import { EmptyState, ErrorState, LinkButton, Loading, PageHeading, Segmented } from "../components/ui";
import { useI18n } from "../i18n/I18n";
import { errorText, humanize, money, relative } from "../lib/format";
import { resolveAll, useAsync } from "../lib/hooks";
import { photoFor } from "../lib/media";

// ---------- Favoritos ----------

type Resolved = { fav: Favorito; item: Atractivo | Comercio | Evento | Servicio | null };

const getters: Record<TipoFavorito, (id: number | string) => Promise<Atractivo | Comercio | Evento | Servicio>> = {
  ATRACTIVO: atractivos.obtener,
  COMERCIO: comercios.obtener,
  EVENTO: eventos.obtener,
  SERVICIO: servicios.obtener,
};

function ServicioCard({ s }: { s: Servicio }) {
  const { lang, t } = useI18n();
  return (
    <article className="offer-card">
      <Link to={`/comercios/${s.comercioId}`} className="card-link">
        <div className="card-image">
          <img src={photoFor(s.nombre, s.id)} alt="" loading="lazy" />
        </div>
        <div className="card-body">
          <h3>{s.nombre}</h3>
          <p className="card-meta num">{money(s.precioBase, lang)}</p>
          <p className="card-meta">{t("detail.capacity", { min: s.minPersonas, max: s.maxPersonas })}</p>
        </div>
      </Link>
    </article>
  );
}

export function Favorites() {
  const { t } = useI18n();
  const fav = useFavorites();
  const [tab, setTab] = useState<TipoFavorito>("ATRACTIVO");
  const ids = fav.list.map((f) => f.id).join(",");
  const data = useAsync<Resolved[]>(
    () => Promise.all(fav.list.map(async (f) => ({ fav: f, item: await getters[f.tipo](f.refId).catch(() => null) }))),
    [ids],
  );

  const shown = (data.data ?? []).filter((r) => r.fav.tipo === tab);
  const counts = (tp: TipoFavorito) => fav.list.filter((f) => f.tipo === tp).length;

  return (
    <main className="shell page">
      <PageHeading title={t("fav.title")} lead={t("fav.lead")} />
      <Segmented
        label={t("fav.title")}
        value={tab}
        onChange={setTab}
        options={(["ATRACTIVO", "COMERCIO", "SERVICIO", "EVENTO"] as TipoFavorito[]).map((v) => ({
          value: v,
          label: t(`fav.tab.${v}`),
          count: counts(v),
        }))}
      />
      {data.loading && !data.data ? (
        <Loading />
      ) : data.error ? (
        <ErrorState error={data.error} onRetry={data.reload} />
      ) : shown.length === 0 ? (
        <EmptyState icon={HeartOff} title={t("fav.empty")} action={<LinkButton to="/explorar">{t("fav.emptyCta")}</LinkButton>} />
      ) : (
        <div className="offer-grid">
          {shown.map(({ fav: f, item }) =>
            !item ? (
              <article key={f.id} className="offer-card gone">
                <div className="card-body">
                  <h3>{t("fav.unavailable")}</h3>
                  <button type="button" className="text-danger" onClick={() => fav.remove(f.id)}>
                    <Trash2 size={16} /> {t("fav.remove")}
                  </button>
                </div>
              </article>
            ) : (
              <div key={f.id} className="fav-wrap">
                {f.tipo === "ATRACTIVO" && <AtractivoCard a={item as Atractivo} />}
                {f.tipo === "COMERCIO" && <ComercioCard c={item as Comercio} />}
                {f.tipo === "EVENTO" && <EventoCard e={item as Evento} />}
                {f.tipo === "SERVICIO" && <ServicioCard s={item as Servicio} />}
                <button type="button" className="remove-fav" onClick={() => fav.remove(f.id)}>
                  <Trash2 size={16} /> {t("fav.remove")}
                </button>
              </div>
            ),
          )}
        </div>
      )}
    </main>
  );
}

// ---------- Recomendaciones ----------

type RecoTab = "atractivos" | "servicios" | "eventos";

export function Recommendations() {
  const { t } = useI18n();
  const [tab, setTab] = useState<RecoTab>("atractivos");
  const [why, setWhy] = useState<number | null>(null);
  const prefs = useAsync(() => preferencias.obtener().catch(() => null), []);
  const data = useAsync(async () => {
    const ids = await recomendaciones[tab]();
    const get: (id: number | string) => Promise<Atractivo | Servicio | Evento> =
      tab === "atractivos" ? atractivos.obtener : tab === "servicios" ? servicios.obtener : eventos.obtener;
    const items = await resolveAll(ids.slice(0, 12), get);
    return items.filter(Boolean) as (Atractivo | Servicio | Evento)[];
  }, [tab]);

  const cats = prefs.data?.categorias ?? [];
  const items = data.data ?? [];

  const explain = (item: Atractivo | Servicio | Evento) => {
    const parts = [cats.length ? t("reco.whyText", { cats: cats.map(humanize).join(", ") }) : t("reco.whyNoPrefs")];
    if ("estado" in item && item.estado === "ABIERTO") parts.push(t("reco.whyOpen"));
    return parts.join(" ");
  };

  return (
    <main className="shell page">
      <PageHeading title={t("reco.title")} lead={t("reco.lead")} />
      <Segmented
        label={t("reco.title")}
        value={tab}
        onChange={(v) => {
          setTab(v);
          setWhy(null);
        }}
        options={[
          { value: "atractivos", label: t("explore.tab.atractivos") },
          { value: "servicios", label: t("fav.tab.SERVICIO") },
          { value: "eventos", label: t("explore.tab.eventos") },
        ]}
      />
      {data.loading ? (
        <Loading />
      ) : data.error ? (
        <ErrorState error={data.error} onRetry={data.reload} />
      ) : items.length === 0 ? (
        <EmptyState icon={Sparkles} title={t("reco.empty")} hint={t("reco.emptyHint")} action={<LinkButton to="/perfil#intereses">{t("reco.setPrefs")}</LinkButton>} />
      ) : (
        <div className="offer-grid">
          {items.map((item) => (
            <div key={item.id} className="reco-wrap">
              {tab === "atractivos" && <AtractivoCard a={item as Atractivo} />}
              {tab === "servicios" && <ServicioCard s={item as Servicio} />}
              {tab === "eventos" && <EventoCard e={item as Evento} />}
              <button type="button" className="why-button" aria-expanded={why === item.id} onClick={() => setWhy(why === item.id ? null : item.id)}>
                <Lightbulb size={16} /> {t("reco.why")}
              </button>
              {why === item.id && (
                <p className="why-box" role="note">
                  <strong>{t("reco.whyTitle")}.</strong> {explain(item)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

// ---------- Notificaciones ----------

export function Notifications() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const data = useAsync(() => notificaciones.listar(), []);
  const list = useMemo(() => [...(data.data ?? [])].sort((a, b) => b.creadaEn.localeCompare(a.creadaEn)), [data.data]);
  const unread = list.filter((n) => !n.leida);
  const shown = tab === "all" ? list : unread;
  const [busy, setBusy] = useState(false);

  const mark = async (ids: string[]) => {
    setBusy(true);
    data.setData((prev) => (prev ?? []).map((n) => (ids.includes(n.id) ? { ...n, leida: true } : n)));
    try {
      for (const id of ids) await notificaciones.marcarLeida(id);
    } catch (e) {
      toast(errorText(e, t), "error");
      void data.reload();
    } finally {
      setBusy(false);
      window.dispatchEvent(new Event(NOTIF_EVENT));
    }
  };

  return (
    <main className="shell page narrow-page">
      <PageHeading
        title={t("notif.title")}
        lead={t("notif.lead")}
        action={
          unread.length > 0 && (
            <button type="button" className="secondary-button" disabled={busy} onClick={() => mark(unread.map((n) => n.id))}>
              <CheckCheck size={18} /> {t("notif.markAll")}
            </button>
          )
        }
      />
      <Segmented
        label={t("notif.title")}
        value={tab}
        onChange={setTab}
        options={[
          { value: "all", label: t("notif.tab.all") },
          { value: "unread", label: t("notif.tab.unread"), count: unread.length },
        ]}
      />
      {data.loading && !data.data ? (
        <Loading />
      ) : data.error ? (
        <ErrorState error={data.error} onRetry={data.reload} />
      ) : shown.length === 0 ? (
        <EmptyState icon={BellOff} title={tab === "all" ? t("notif.empty") : t("notif.emptyUnread")} />
      ) : (
        <ul className="notif-list">
          {shown.map((n) => (
            <li key={n.id} className={n.leida ? "" : "unread"}>
              <span className="notif-dot" aria-hidden="true" />
              <div>
                <strong>{n.titulo}</strong>
                <p>{n.cuerpo}</p>
                <time dateTime={n.creadaEn}>{relative(n.creadaEn, lang)}</time>
              </div>
              {!n.leida && (
                <button type="button" className="table-action" onClick={() => mark([n.id])}>
                  {t("notif.markOne")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
