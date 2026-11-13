import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useI18n } from "../i18n/I18n";

interface ToastItem {
  id: number;
  text: string;
  tone: "ok" | "error";
}

const ToastContext = createContext<(text: string, tone?: "ok" | "error") => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => setItems((all) => all.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (text: string, tone: "ok" | "error" = "ok") => {
      const id = Date.now() + Math.random();
      setItems((all) => [...all.slice(-2), { id, text, tone }]);
      setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4200);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((it) => (
          <div key={it.id} className={`toast ${it.tone}`}>
            {it.tone === "ok" ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}
            <span>{it.text}</span>
            <button type="button" onClick={() => dismiss(it.id)} aria-label={t("common.close")}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
