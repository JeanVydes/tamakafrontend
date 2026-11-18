import { ArrowLeft, BadgeDollarSign, CalendarX2, Search, ShieldCheck, Store, UserCheck, UserX, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { admin, comercios } from "../api/endpoints";
import type { Cuenta, EstadoPago, EstadoReserva, Rol } from "../api/types";
import { Select } from "../components/Select";
import { useToast } from "../components/Toast";
import { EmptyState, ErrorState, Loading, PageHeading, Pill, ReservaPill } from "../components/ui";
import { useI18n } from "../i18n/I18n";
import { day, errorText, humanize, money } from "../lib/format";
import { useAsync } from "../lib/hooks";
import { PaymentsTable } from "./Operator";

const ROLES: Rol[] = ["TURISTA", "OPERADOR", "GESTOR", "ADMIN"];
const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// ---------- Cuentas ----------

export function AdminAccounts() {
  const { t, lang } = useI18n();
  const data = useAsync(() => admin.cuentas(), []);
  const [q, setQ] = useState("");
  const [rol, setRol] = useState("");
  const [estado, setEstado] = useState("");

  const rows = useMemo(() => {
    let list = data.data ?? [];
    if (q) list = list.filter((c) => norm(`${c.nombre} ${c.email}`).includes(norm(q)));
    if (rol) list = list.filter((c) => c.roles.includes(rol as Rol));
    if (estado) list = list.filter((c) => (estado === "activa" ? c.activa : !c.activa));
    return list;
  }, [data.data, q, rol, estado]);

  return (
    <>
      <PageHeading title={t("panel.accounts")} lead={t("ad.accLead")} />
      <div className="filter-bar">
        <label className="grow">
          <span className="sr-only">{t("ad.searchAcc")}</span>
          <span className="input-icon">
            <Search size={18} />
            <input type="search" placeholder={t("ad.searchAcc")} value={q} onChange={(e) => setQ(e.target.value)} />
          </span>
        </label>
        <label>
          <span className="sr-only">{t("common.role")}</span>
          <Select
            ariaLabel={t("common.role")}
            value={rol}
            onChange={setRol}
            options={[{ value: "", label: t("ad.anyRole") }, ...ROLES.map((r) => ({ value: r, label: t(`nav.space.${r}`) }))]}
          />
        </label>
        <label>
          <span className="sr-only">{t("common.state")}</span>
          <Select
            ariaLabel={t("common.state")}
            value={estado}
            onChange={setEstado}
            options={[
              { value: "", label: t("ad.anyState") },
              { value: "activa", label: t("ad.active") },
              { value: "suspendida", label: t("ad.suspended") },
            ]}
          />
        </label>
      </div>
      <section className="data-card">
        {data.loading ? (
          <Loading />
        ) : data.error ? (
          <ErrorState error={data.error} onRetry={data.reload} />
        ) : rows.length === 0 ? (
          <EmptyState icon={UsersRound} title={t("ad.accEmpty")} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("common.name")}</th>
                  <th>{t("common.email")}</th>
                  <th>{t("profile.roles")}</th>
                  <th>{t("common.state")}</th>
                  <th>{t("ad.created")}</th>
                  <th>
                    <span className="sr-only">{t("common.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.nombre}</strong>
                    </td>
                    <td>{c.email}</td>
                    <td>{c.roles.map((r) => t(`nav.space.${r}`)).join(", ")}</td>
                    <td>
                      <Pill tone={c.activa ? "ok" : "warning"}>{c.activa ? t("ad.active") : t("ad.suspended")}</Pill>
                    </td>
                    <td>{day(c.creadaEn, lang)}</td>
                    <td className="row-actions">
                      <Link to={`/admin/cuentas/${c.id}`} className="table-action">
                        {t("common.seeDetail")}
                      </Link>
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

export function AdminAccountDetail() {
  const { id = "" } = useParams();
  const { t, lang } = useI18n();
  const toast = useToast();
  const data = useAsync(() => admin.cuenta(Number(id)), [id]);
  const biz = useAsync(async () => (await comercios.buscar()).filter((c) => c.operadorId === Number(id)), [id]);
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<Cuenta>) => {
    setBusy(true);
    try {
      data.setData(await fn());
      toast(t("ad.updated"));
      setMotivo("");
      void biz.reload();
    } catch (e) {
      toast(errorText(e, t), "error");
    } finally {
      setBusy(false);
    }
  };

  if (data.loading) return <Loading />;
  if (data.error || !data.data) return <ErrorState error={data.error} onRetry={data.reload} />;
  const c = data.data;
  const isGestor = c.roles.includes("GESTOR");

  return (
    <>
      <Link to="/admin" className="back-link">
        <ArrowLeft size={16} /> {t("panel.accounts")}
      </Link>
      <PageHeading title={c.nombre} lead={c.email} />
      <div className="two-col">
        <section className="details-card">
          <h2>{t("ad.detail")}</h2>
          <dl className="facts">
            <div>
              <dt>{t("profile.roles")}</dt>
              <dd className="pill-row">
                {c.roles.map((r) => (
                  <Pill key={r} tone="neutral">
                    {t(`nav.space.${r}`)}
                  </Pill>
                ))}
              </dd>
            </div>
            <div>
              <dt>{t("common.state")}</dt>
              <dd>
                <Pill tone={c.activa ? "ok" : "warning"}>{c.activa ? t("ad.active") : t("ad.suspended")}</Pill>
              </dd>
            </div>
            <div>
              <dt>{t("ad.created")}</dt>
              <dd>{day(c.creadaEn, lang)}</dd>
            </div>
          </dl>
          {c.roles.includes("OPERADOR") && (
            <>
              <h3 className="sub">{t("panel.businesses")}</h3>
              {biz.data?.length ? (
                <ul className="plain-list">
                  {biz.data.map((b) => (
                    <li key={b.id}>
                      <Link to={`/comercios/${b.id}`}>{b.nombre}</Link> <span className="muted num">RNT {b.rnt}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">—</p>
              )}
            </>
          )}
        </section>
        <section className="details-card">
          <h2>{t("common.actions")}</h2>
          <div className="form-stack">
            {c.activa ? (
              <>
                <label>
                  <span>{t("ad.reason")} <span className="muted">({t("common.optional")})</span></span>
                  <textarea rows={2} maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                  <small>{t("ad.suspendNote")}</small>
                </label>
                <button type="button" className="danger-button" disabled={busy} onClick={() => act(() => admin.suspension(c.id, true, motivo || undefined))}>
                  <UserX size={17} /> {t("ad.suspend")}
                </button>
              </>
            ) : (
              <button type="button" className="primary-button" disabled={busy} onClick={() => act(() => admin.suspension(c.id, false))}>
                <UserCheck size={17} /> {t("ad.reactivate")}
              </button>
            )}
            <button type="button" className="secondary-button" disabled={busy || isGestor} onClick={() => act(() => admin.asignarGestor(c.id))}>
              <ShieldCheck size={17} /> {isGestor ? t("ad.isGestor") : t("ad.makeGestor")}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

// ---------- Comercios ----------

export function AdminBusinesses() {
  const { t } = useI18n();
  const data = useAsync(() => comercios.buscar(), []);
  return (
    <>
      <PageHeading title={t("panel.allBusinesses")} lead={t("ad.bizLead")} />
      <section className="data-card">
        {data.loading ? (
          <Loading />
        ) : data.error ? (
          <ErrorState error={data.error} onRetry={data.reload} />
        ) : !data.data?.length ? (
          <EmptyState icon={Store} title={t("ad.empty")} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("detail.business")}</th>
                  <th>{t("common.category")}</th>
                  <th>RNT</th>
                  <th>{t("ad.operator")}</th>
                  <th>
                    <span className="sr-only">{t("common.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.nombre}</strong>
                    </td>
                    <td>{humanize(c.categoria)}</td>
                    <td className="num">{c.rnt}</td>
                    <td className="num">#{c.operadorId}</td>
                    <td className="row-actions">
                      <Link to={`/admin/cuentas/${c.operadorId}`} className="table-action">
                        {t("ad.goOperator")}
                      </Link>
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

// ---------- Reservas y pagos ----------

const RES_STATES: EstadoReserva[] = ["PENDIENTE", "ACEPTADA", "CONFIRMADA", "FINALIZADA", "RECHAZADA", "CANCELADA"];
const PAY_STATES: EstadoPago[] = ["PENDIENTE", "APROBADO", "RECHAZADO", "REEMBOLSADO"];

export function AdminBookings() {
  const { t, lang } = useI18n();
  const [estado, setEstado] = useState<EstadoReserva | "">("");
  const data = useAsync(() => admin.reservas(estado || undefined), [estado]);
  return (
    <>
      <PageHeading title={t("panel.bookings")} lead={t("ad.resLead")} />
      <div className="chip-list filter-chips">
        <button type="button" className={!estado ? "chip on" : "chip"} onClick={() => setEstado("")}>
          {t("common.all")}
        </button>
        {RES_STATES.map((s) => (
          <button key={s} type="button" className={estado === s ? "chip on" : "chip"} aria-pressed={estado === s} onClick={() => setEstado(s)}>
            {t(`reserva.${s}`)}
          </button>
        ))}
      </div>
      <section className="data-card">
        {data.loading ? (
          <Loading />
        ) : data.error ? (
          <ErrorState error={data.error} onRetry={data.reload} />
        ) : !data.data?.length ? (
          <EmptyState icon={CalendarX2} title={t("ad.empty")} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("common.reference")}</th>
                  <th>{t("res.service")}</th>
                  <th>{t("ad.tourist")}</th>
                  <th>{t("ad.operator")}</th>
                  <th>{t("res.date")}</th>
                  <th className="right">{t("res.amount")}</th>
                  <th>{t("common.state")}</th>
                </tr>
              </thead>
              <tbody>
                {[...data.data]
                  .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))
                  .map((r) => (
                    <tr key={r.id}>
                      <td className="num">R-{r.id}</td>
                      <td className="num">#{r.servicioId}</td>
                      <td className="num">#{r.turistaId}</td>
                      <td className="num">#{r.operadorId}</td>
                      <td>{day(r.fechaReserva, lang)}</td>
                      <td className="num right">{money(r.valorAPagar, lang)}</td>
                      <td>
                        <ReservaPill estado={r.estado} />
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

export function AdminPayments() {
  const { t } = useI18n();
  const [estado, setEstado] = useState<EstadoPago | "">("");
  const data = useAsync(() => admin.pagos(estado || undefined), [estado]);
  return (
    <>
      <PageHeading title={t("panel.payments")} lead={t("ad.payLead")} />
      <div className="chip-list filter-chips">
        <button type="button" className={!estado ? "chip on" : "chip"} onClick={() => setEstado("")}>
          {t("common.all")}
        </button>
        {PAY_STATES.map((s) => (
          <button key={s} type="button" className={estado === s ? "chip on" : "chip"} aria-pressed={estado === s} onClick={() => setEstado(s)}>
            {t(`pago.${s}`)}
          </button>
        ))}
      </div>
      <section className="data-card">
        {data.loading ? (
          <Loading />
        ) : data.error ? (
          <ErrorState error={data.error} onRetry={data.reload} />
        ) : !data.data?.length ? (
          <EmptyState icon={BadgeDollarSign} title={t("ad.empty")} />
        ) : (
          <PaymentsTable showParties rows={[...data.data].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))} />
        )}
      </section>
    </>
  );
}
