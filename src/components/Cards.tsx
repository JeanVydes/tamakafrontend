import { ArrowRight, BadgeCheck, CalendarDays, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import type { Atractivo, Comercio, Evento } from "../api/types";
import { useI18n } from "../i18n/I18n";
import { day, humanize } from "../lib/format";
import { coverFor } from "../lib/media";
import { EstadoPill, FavButton } from "./ui";

function CardImage({ src, alt, category, illustrative }: { src: string; alt: string; category: string; illustrative: boolean }) {
  const { t } = useI18n();
  return (
    <>
      <img src={src} alt={alt} loading="lazy" decoding="async" />
      <span className="category-pill">{humanize(category)}</span>
      {illustrative && <span className="illustrative-tag">{t("common.illustrative")}</span>}
    </>
  );
}

export function AtractivoCard({ a }: { a: Atractivo }) {
  const { t } = useI18n();
  return (
    <article className={`offer-card state-${a.estado.toLowerCase()}`}>
      <Link to={`/atractivos/${a.id}`} className="card-link">
        <div className="card-image">
          <CardImage {...coverFor(a.imagen, `${a.nombre} ${a.categoria}`, a.id)} alt="" category={a.categoria} />
          {/* El aviso va sobre la foto y no en el flujo: así ninguna tarjeta crece ni desalinea a sus vecinas. */}
          {a.estado !== "ABIERTO" && (
            <span className="state-chip">
              {t(`estado.${a.estado}`)}
              <span className="sr-only">. {a.estado === "CERRADO" ? t("detail.closedNote") : t("detail.restrictedNote")}</span>
            </span>
          )}
        </div>
        <div className="card-body">
          <h3>{a.nombre}</h3>
          <p className="card-meta">
            <MapPin size={15} /> Santa Marta, Magdalena
          </p>
          {a.descripcion && <p className="card-desc">{a.descripcion}</p>}
          <div className="card-footer">
            <EstadoPill estado={a.estado} />
            <span className="card-cta">
              {t("common.seeDetail")} <ArrowRight size={16} />
            </span>
          </div>
        </div>
      </Link>
      <FavButton tipo="ATRACTIVO" refId={a.id} />
    </article>
  );
}

export function ComercioCard({ c }: { c: Comercio }) {
  const { t } = useI18n();
  return (
    <article className="offer-card">
      <Link to={`/comercios/${c.id}`} className="card-link">
        <div className="card-image">
          <CardImage {...coverFor(c.imagen, c.categoria, c.id + 7)} alt="" category={c.categoria} />
        </div>
        <div className="card-body">
          <h3>{c.nombre}</h3>
          <p className="card-meta">
            <BadgeCheck size={15} /> {t("detail.rnt", { rnt: c.rnt })}
          </p>
          {c.descripcion && <p className="card-desc">{c.descripcion}</p>}
          <div className="card-footer">
            <span className="card-cta">
              {t("card.services")} <ArrowRight size={16} />
            </span>
          </div>
        </div>
      </Link>
      <FavButton tipo="COMERCIO" refId={c.id} />
    </article>
  );
}

export function EventoCard({ e }: { e: Evento }) {
  const { t, lang } = useI18n();
  const start = new Date(`${e.fechaInicio}T00:00:00`);
  return (
    <article className="offer-card event">
      <Link to={`/eventos/${e.id}`} className="card-link">
        <div className="card-image">
          <CardImage {...coverFor(e.imagen, e.categoria || "evento", e.id + 3)} alt="" category={e.categoria || "GENERAL"} />
          <span className="date-chip" aria-hidden="true">
            <strong>{start.getDate()}</strong>
            <small>{start.toLocaleDateString(lang === "en" ? "en-US" : "es-CO", { month: "short" })}</small>
          </span>
        </div>
        <div className="card-body">
          <h3>{e.titulo}</h3>
          <p className="card-meta">
            <MapPin size={15} /> {e.lugar}
          </p>
          <div className="card-footer">
            <span className="card-meta">
              <CalendarDays size={15} />
              {e.fechaInicio === e.fechaFin ? day(e.fechaInicio, lang) : `${day(e.fechaInicio, lang, { year: undefined })} – ${day(e.fechaFin, lang)}`}
            </span>
            <span className="card-cta" aria-hidden="true">
              <ArrowRight size={16} />
            </span>
          </div>
          <span className="sr-only">{t("common.seeDetail")}</span>
        </div>
      </Link>
      <FavButton tipo="EVENTO" refId={e.id} />
    </article>
  );
}
