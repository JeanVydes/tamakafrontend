import { useCallback, useEffect, useRef, useState } from "react";

export interface Async<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => Promise<void>;
  setData: (updater: T | ((prev: T | undefined) => T)) => void;
}

/** Carga datos al montar (y cuando cambian deps). Ignora respuestas que llegan tarde. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): Async<T> {
  const [data, setDataState] = useState<T>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    setError(undefined);
    try {
      const result = await fnRef.current();
      if (id === seq.current) setDataState(result);
    } catch (e) {
      if (id === seq.current) setError(e);
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const setData = useCallback((updater: T | ((prev: T | undefined) => T)) => {
    setDataState((prev) => (typeof updater === "function" ? (updater as (p: T | undefined) => T)(prev) : updater));
  }, []);

  return { data, error, loading, reload, setData };
}

/** Resuelve en paralelo una lista de ids contra un endpoint de detalle; los que fallan quedan como null. */
export async function resolveAll<T>(ids: (number | string)[], get: (id: number | string) => Promise<T>) {
  return Promise.all(ids.map((id) => get(id).catch(() => null)));
}

const cache = new Map<string, Promise<unknown>>();

/** Memoriza consultas de solo lectura repetidas (p. ej. el nombre de un servicio en cada reserva). */
export function cached<T>(key: string, get: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) {
    const p = get().catch((e) => {
      cache.delete(key);
      throw e;
    });
    cache.set(key, p);
  }
  return cache.get(key) as Promise<T>;
}
