/** tiny safe localStorage wrapper (throws in some private modes) */
export const store = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v) as T; } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k: string) { try { localStorage.removeItem(k); } catch {} },
};
