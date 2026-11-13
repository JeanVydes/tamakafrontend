import { Check, X } from "lucide-react";
import type { EstadoReserva } from "../api/types";
import { useI18n } from "../i18n/I18n";
import type { MessageKey } from "../i18n/messages";

// Firma del producto: la cadena solicitud → decisión del operador → pago → disfrute,
// la misma para el viajero y para el operador.

const steps: { key: MessageKey }[] = [
  { key: "rail.solicitada" },
  { key: "rail.aceptada" },
  { key: "rail.pagada" },
  { key: "rail.finalizada" },
];

const reached: Record<EstadoReserva, number> = {
  PENDIENTE: 0,
  ACEPTADA: 1,
  CONFIRMADA: 2,
  FINALIZADA: 3,
  RECHAZADA: 0,
  CANCELADA: -1,
};

export function JourneyRail({ estado, pagada, aceptada }: { estado: EstadoReserva; pagada?: boolean; aceptada?: boolean }) {
  const { t } = useI18n();
  const broken = estado === "RECHAZADA" || estado === "CANCELADA";
  // Una cancelación corta la cadena donde estaba: tras "Pagada" si hubo pago, tras "Aceptada" si el operador la aceptó.
  const at = estado === "CANCELADA" ? (pagada ? 2 : aceptada ? 1 : 0) : reached[estado];
  const brokenLabel = estado === "RECHAZADA" ? t("rail.rechazada") : t("rail.cancelada");

  return (
    <ol className={broken ? "rail broken" : "rail"} aria-label={t("rail.label")}>
      {steps.map((s, i) => {
        const done = i < at || (!broken && i === at && estado === "FINALIZADA");
        const current = !broken && i === at && estado !== "FINALIZADA";
        const cut = broken && i === at + 1;
        const after = broken && i > at;
        const cls = [done ? "done" : "", current ? "current" : "", cut ? "cut" : "", after && !cut ? "off" : ""]
          .filter(Boolean)
          .join(" ");
        return (
          <li key={s.key} className={cls} aria-current={current ? "step" : undefined}>
            <span className="dot" aria-hidden="true">
              {done || (broken && i <= at) ? <Check size={12} strokeWidth={3} /> : cut ? <X size={12} strokeWidth={3} /> : null}
            </span>
            <span className="rail-label">{cut ? brokenLabel : t(s.key)}</span>
          </li>
        );
      })}
    </ol>
  );
}
