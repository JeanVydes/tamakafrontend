import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { favoritos } from "../api/endpoints";
import type { Favorito, TipoFavorito } from "../api/types";
import { useToast } from "../components/Toast";
import { useI18n } from "../i18n/I18n";
import { errorText } from "../lib/format";
import { useAuth } from "./Auth";

interface FavValue {
  list: Favorito[];
  enabled: boolean;
  isFav: (tipo: TipoFavorito, refId: number | string) => boolean;
  toggle: (tipo: TipoFavorito, refId: number | string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

const FavContext = createContext<FavValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { has, cuenta } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const enabled = has("TURISTA");
  const [list, setList] = useState<Favorito[]>([]);

  const reload = useCallback(async () => {
    if (!enabled) return setList([]);
    try {
      setList(await favoritos.listar());
    } catch {
      setList([]);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload, cuenta?.id]);

  const find = useCallback(
    (tipo: TipoFavorito, refId: number | string) => list.find((f) => f.tipo === tipo && f.refId === String(refId)),
    [list],
  );

  const toggle = useCallback(
    async (tipo: TipoFavorito, refId: number | string) => {
      const existing = find(tipo, refId);
      try {
        if (existing) {
          setList((l) => l.filter((f) => f.id !== existing.id));
          await favoritos.eliminar(existing.id);
          toast(t("common.removed"));
        } else {
          const created = await favoritos.guardar(tipo, String(refId));
          setList((l) => [...l, created]);
          toast(t("common.saved"));
        }
      } catch (e) {
        toast(errorText(e, t), "error");
        void reload();
      }
    },
    [find, reload, t, toast],
  );

  const remove = useCallback(
    async (id: string) => {
      setList((l) => l.filter((f) => f.id !== id));
      try {
        await favoritos.eliminar(id);
      } catch (e) {
        toast(errorText(e, t), "error");
        void reload();
      }
    },
    [reload, t, toast],
  );

  const value = useMemo(
    () => ({ list, enabled, isFav: (tp: TipoFavorito, id: number | string) => !!find(tp, id), toggle, remove, reload }),
    [list, enabled, find, toggle, remove, reload],
  );
  return <FavContext.Provider value={value}>{children}</FavContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavContext);
  if (!ctx) throw new Error("useFavorites fuera de FavoritesProvider");
  return ctx;
}
