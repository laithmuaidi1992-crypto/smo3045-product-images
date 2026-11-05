import { Injectable } from '@angular/core';
import { SB_KEY, SB_URL } from './env';

export class ApiError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

/** Thin client for the store's public RPC `orders_app(action, args)` on Supabase. */
@Injectable({ providedIn: 'root' })
export class Api {
  async rpc<T = any>(action: string, args: Record<string, unknown> = {}, timeoutMs = 20000): Promise<T> {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    let r: Response;
    try {
      r = await fetch(`${SB_URL}/rest/v1/rpc/orders_app`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
        body: JSON.stringify({ action, args }),
        signal: ctl.signal,
      });
    } catch (e: any) {
      throw new ApiError('offline', e?.name === 'AbortError' ? 'انتهت مهلة الاتصال' : 'تعذّر الاتصال بالإنترنت');
    } finally { clearTimeout(t); }
    if (!r.ok) {
      let j: any = null; try { j = await r.json(); } catch {}
      const msg: string = (j && (j.message || j.hint)) || `HTTP ${r.status}`;
      if (/blocked/i.test(msg)) throw new ApiError('blocked', 'هذا الرقم موقوف عن الطلب. تواصل مع المتجر.');
      if (r.status >= 500 || r.status === 429) throw new ApiError('server', 'الخادم مشغول، حاول بعد لحظات');
      throw new ApiError('error', msg);
    }
    return r.json() as Promise<T>;
  }
}

export function errText(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return 'حدث خطأ غير متوقع، حاول مرة أخرى';
}
