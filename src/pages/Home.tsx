import { ArrowRight, BadgeCheck, CalendarClock, HandCoins, Leaf, Search, Send } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { atractivos, comercios, eventos } from "../api/endpoints";
import { AtractivoCard, ComercioCard, EventoCard } from "../components/Cards";
import { ErrorState, Loading } from "../components/ui";
import { useI18n } from "../i18n/I18n";
import type { MessageKey } from "../i18n/messages";
import { todayIso } from "../lib/format";
import { useAsync } from "../lib/hooks";
import { photos } from "../lib/media";

export function SearchBox({ placeholder, initial = "", compact = false, onSearch }: { placeholder: string; initial?: string; compact?: boolean; onSearch: (q: string) => void }) {
  const { t } = useI18n();
  const [q, setQ] = useState(initial);
  const sent = useRef(initial.trim());

  const send = (value: string) => {
    sent.current = value.trim();
    onSearch(sent.current);
  };

  // Si el valor cambia desde fuera (p. ej. «Limpiar filtros»), el campo lo refleja; lo que uno mismo envió no se pisa.
  useEffect(() => {
    if (initial.trim() !== sent.current) {
      sent.current = initial.trim();
      setQ(initial);
    }
  }, [initial]);

  // En el modo compacto (Explorar) el resultado se actualiza mientras se escribe, con una pausa corta.
  useEffect(() => {
    if (!compact || q.trim() === sent.current) return;
    const id = window.setTimeout(() => send(q), 300);
    return () => window.clearTimeout(id);
  }, [q, compact]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(q);
  };
  return (
    <form className={compact ? "search-box compact" : "search-box"} onSubmit={submit} role="search">
      <Search size={20} aria-hidden="true" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} type="search" />
      <button type="submit">{t("common.search")}</button>
    </form>
  );
}

function Section({ title, lead, to, children }: { title: string; lead: string; to: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="shell section">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p>{lead}</p>
        </div>
        <Link to={to} className="text-link">
          {t("home.seeAll")} <ArrowRight size={16} />
        </Link>
      </div>
      {children}
    </section>
  );
}

export function Home() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const data = useAsync(
    () => Promise.all([atractivos.buscar(), comercios.buscar(), eventos.listar(todayIso())]),
    [],
  );
  const [attr, biz, evs] = data.data ?? [[], [], []];
  const open = attr.filter((a) => a.estado === "ABIERTO").length;

  const steps: { icon: typeof Send; key: MessageKey }[] = [
    { icon: Send, key: "home.how1" },
    { icon: BadgeCheck, key: "home.how2" },
    { icon: HandCoins, key: "home.how3" },
  ];

  // Primero los atractivos con restricciones o cerrados: el estado va antes que la promoción.
  const featured = [...attr].sort((a, b) => (a.estado === "ABIERTO" ? 1 : 0) - (b.estado === "ABIERTO" ? 1 : 0)).slice(0, 3);

  return (
    <main>
      <section className="hero">
        <img src={photos.hero} alt="" {...{ fetchpriority: "high" }} />
        <div className="hero-overlay" />
        <div className="shell hero-content">
          <h1>
            {t("home.title1")}
            <br />
            {t("home.title2")}
          </h1>
          <p>{t("home.lead")}</p>
          <SearchBox placeholder={t("home.searchPlaceholder")} onSearch={(q) => navigate(`/explorar${q ? `?q=${encodeURIComponent(q)}` : ""}`)} />
          {/* Cifras reales de la API, no valoraciones inventadas. El hueco se reserva mientras cargan. */}
          <dl className="hero-proof" aria-busy={data.loading}>
            {[
              [t("home.stat.open"), open],
              [t("home.stat.services"), biz.length],
              [t("home.stat.events"), evs.length],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{data.loading ? <span className="stat-skeleton" aria-hidden="true" /> : data.error ? "—" : value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {data.loading && (
        <div className="shell section">
          <Loading />
        </div>
      )}
      {!!data.error && (
        <div className="shell section">
          <ErrorState error={data.error} onRetry={data.reload} />
        </div>
      )}

      {featured.length > 0 && (
        <Section title={t("home.attractions")} lead={t("home.attractionsLead")} to="/explorar?tab=atractivos">
          <div className="offer-grid">
            {featured.map((a) => (
              <AtractivoCard key={a.id} a={a} />
            ))}
          </div>
        </Section>
      )}

      <section className="shell how">
        <h2>{t("home.howTitle")}</h2>
        <ol>
          {steps.map(({ icon: Icon, key }, i) => (
            <li key={key}>
              <span className="how-icon">
                <Icon size={20} />
              </span>
              <span className="how-step" aria-hidden="true">
                {i + 1}
              </span>
              <p>{t(key)}</p>
            </li>
          ))}
        </ol>
      </section>

      {biz.length > 0 && (
        <Section title={t("home.businesses")} lead={t("home.businessesLead")} to="/explorar?tab=comercios">
          <div className="offer-grid">
            {biz.slice(0, 3).map((c) => (
              <ComercioCard key={c.id} c={c} />
            ))}
          </div>
        </Section>
      )}

      {evs.length > 0 && (
        <Section title={t("home.events")} lead={t("home.eventsLead")} to="/explorar?tab=eventos">
          <div className="offer-grid">
            {evs.slice(0, 3).map((e) => (
              <EventoCard key={e.id} e={e} />
            ))}
          </div>
        </Section>
      )}

      <section className="shell responsible" id="responsable">
        <span className="responsible-icon">
          <Leaf size={22} />
        </span>
        <div>
          <h2>{t("home.responsible")}</h2>
          <p>{t("home.responsibleText")}</p>
        </div>
        <Link to="/explorar?tab=atractivos&estado=RESTRINGIDO" className="secondary-button on-dark">
          <CalendarClock size={18} /> {t("estado.RESTRINGIDO")}
        </Link>
      </section>
    </main>
  );
}
