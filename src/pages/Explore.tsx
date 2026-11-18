import { SearchX, SlidersHorizontal } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { atractivos, comercios, eventos } from "../api/endpoints";
import type { Atractivo, Comercio, EstadoAtractivo, Evento } from "../api/types";
import { AtractivoCard, ComercioCard, EventoCard } from "../components/Cards";
import { EmptyState, ErrorState, Loading, PageHeading, Segmented } from "../components/ui";
import { useI18n } from "../i18n/I18n";
import { humanize, todayIso } from "../lib/format";
import { useAsync } from "../lib/hooks";
import { SearchBox } from "./Home";

type Tab = "atractivos" | "comercios" | "eventos";
const TABS: Tab[] = ["atractivos", "comercios", "eventos"];
const ESTADOS: EstadoAtractivo[] = ["ABIERTO", "RESTRINGIDO", "CERRADO"];

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function Explore() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.includes(params.get("tab") as Tab) ? params.get("tab") : "atractivos") as Tab;
  const q = params.get("q") ?? "";
  const categoria = params.get("categoria") ?? "";
  const estado = params.get("estado") ?? "";
  const desde = params.get("desde") ?? todayIso();

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  // El texto se filtra aquí y no en el servidor: la búsqueda del backend distingue tildes («bahia» no encuentra
  // «Bahía») y cada escritura sería una petición nueva. Los listados son pequeños (el backend no pagina).
  const data = useAsync<Atractivo[] | Comercio[] | Evento[]>(() => {
    if (tab === "atractivos") return atractivos.buscar();
    if (tab === "comercios") return comercios.buscar({});
    return eventos.listar(desde);
  }, [tab, desde]);

  const all = data.data ?? [];
  const categories = useMemo(() => [...new Set(all.map((x) => x.categoria).filter(Boolean))].sort(), [all]);

  const items = useMemo(() => {
    let list = all as (Atractivo | Comercio | Evento)[];
    if (categoria) list = list.filter((x) => x.categoria === categoria);
    if (tab === "atractivos" && estado) list = (list as Atractivo[]).filter((x) => x.estado === estado);
    if (q) {
      // Todas las palabras deben aparecer en nombre, categoría, lugar o descripción (sin tildes ni mayúsculas).
      const words = norm(q).split(/\s+/).filter(Boolean);
      list = list.filter((x) => {
        const hay = norm(
          [("nombre" in x ? x.nombre : x.titulo), x.categoria, "lugar" in x ? x.lugar : "", "rnt" in x ? x.rnt : "", x.descripcion ?? ""].join(" "),
        );
        return words.every((w) => hay.includes(w));
      });
    }
    return list;
  }, [all, categoria, estado, q, tab]);

  const hasFilters = !!(categoria || estado || q);
  const tabLabel = t(`explore.tab.${tab}`);

  return (
    <main className="shell page">
      <PageHeading title={t("explore.title")} lead={t("explore.lead")} />
      <div className="explore-search">
        <SearchBox compact initial={q} placeholder={t("explore.searchPlaceholder")} onSearch={(v) => update({ q: v || null })} />
      </div>
      <Segmented
        label={t("explore.title")}
        value={tab}
        onChange={(v) => update({ tab: v, categoria: null, estado: null })}
        options={TABS.map((v) => ({ value: v, label: t(`explore.tab.${v}`) }))}
      />

      <div className="explore-layout">
        <aside className="filters" aria-label={t("explore.filters")}>
          <h2>
            <SlidersHorizontal size={17} /> {t("explore.filters")}
          </h2>
          <fieldset>
            <legend>{t("explore.filter.category")}</legend>
            <div className="chip-list">
              <button type="button" className={!categoria ? "chip on" : "chip"} onClick={() => update({ categoria: null })}>
                {t("common.all")}
              </button>
              {categories.map((c) => (
                <button key={c} type="button" className={categoria === c ? "chip on" : "chip"} aria-pressed={categoria === c} onClick={() => update({ categoria: categoria === c ? null : c })}>
                  {humanize(c)}
                </button>
              ))}
            </div>
          </fieldset>
          {tab === "atractivos" && (
            <fieldset>
              <legend>{t("explore.filter.state")}</legend>
              <div className="chip-list">
                {ESTADOS.map((s) => (
                  <button key={s} type="button" className={estado === s ? "chip on" : "chip"} aria-pressed={estado === s} onClick={() => update({ estado: estado === s ? null : s })}>
                    {t(`estado.${s}`)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {tab === "eventos" && (
            <label>
              {t("explore.filter.since")}
              <input type="date" value={desde} onChange={(e) => update({ desde: e.target.value || null })} />
            </label>
          )}
          {hasFilters && (
            <button type="button" className="text-link" onClick={() => update({ q: null, categoria: null, estado: null })}>
              {t("explore.filter.clear")}
            </button>
          )}
        </aside>

        <section aria-live="polite">
          {data.loading ? (
            <Loading />
          ) : data.error ? (
            <ErrorState error={data.error} onRetry={data.reload} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={hasFilters ? t("explore.empty") : t("explore.emptyAll", { what: tabLabel.toLowerCase() })}
              hint={hasFilters ? t("explore.emptyHint") : undefined}
            />
          ) : (
            <>
              <p className="result-count">{items.length === 1 ? t("explore.result") : t("explore.results", { n: items.length })}</p>
              <div className="offer-grid">
                {tab === "atractivos" && (items as Atractivo[]).map((a) => <AtractivoCard key={a.id} a={a} />)}
                {tab === "comercios" && (items as Comercio[]).map((c) => <ComercioCard key={c.id} c={c} />)}
                {tab === "eventos" && (items as Evento[]).map((e) => <EventoCard key={e.id} e={e} />)}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
