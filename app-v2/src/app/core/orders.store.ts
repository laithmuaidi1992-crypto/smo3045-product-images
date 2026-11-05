import { Injectable, inject, signal } from '@angular/core';
import { Api } from './api.service';
import { CartStore } from './cart.store';
import { Catalog } from './catalog.store';
import { CustomerStore } from './customer.store';
import { Native } from './native.service';
import { store } from './store';

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
export interface OrderItem { id: string; name: string; price: number; qty: number; line: number; }
export interface Order {
  id?: string; order_no: string; status: OrderStatus; total: number; items: OrderItem[];
  created_at: string; updated_at?: string; assigned_driver?: string | null;
  customer_address?: string; customer_location_lat?: number | null; customer_location_lng?: number | null; customer_notes?: string | null;
}
export type PayMethod = 'cash' | 'card' | 'cliq';
export interface Checkout { no?: string; pay: PayMethod; when: 'now' | 'later'; slot?: string; notes?: string; }

export const STATUS: Record<OrderStatus, { label: string; short: string; step: number; tone: 'navy' | 'amber' | 'fresh' | 'red' }> = {
  pending: { label: 'بانتظار تأكيد المتجر', short: 'بانتظار التأكيد', step: 0, tone: 'amber' },
  confirmed: { label: 'تم قبول طلبك', short: 'مؤكد', step: 1, tone: 'navy' },
  preparing: { label: 'نجهّز طلبك الآن', short: 'قيد التجهيز', step: 2, tone: 'navy' },
  ready: { label: 'طلبك جاهز وبانتظار المندوب', short: 'جاهز', step: 2, tone: 'navy' },
  out_for_delivery: { label: 'المندوب في الطريق إليك', short: 'في الطريق', step: 3, tone: 'navy' },
  delivered: { label: 'تم التسليم، بالهناء', short: 'تم التسليم', step: 4, tone: 'fresh' },
  cancelled: { label: 'أُلغي الطلب', short: 'ملغي', step: -1, tone: 'red' },
};
export const STEPS = [
  { key: 'pending', label: 'استلمنا طلبك' },
  { key: 'confirmed', label: 'تم القبول' },
  { key: 'preparing', label: 'التجهيز' },
  { key: 'out_for_delivery', label: 'في الطريق' },
  { key: 'delivered', label: 'تم التسليم' },
];
export const PAY_LABEL: Record<PayMethod, string> = { cash: 'كاش عند الاستلام', card: 'بطاقة عند الاستلام', cliq: 'CliQ — تحويل فوري' };
export const isOpen = (s: OrderStatus) => s !== 'delivered' && s !== 'cancelled';

export function genOrderNo(): string {
  const d = new Date();
  const ymd = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = ''; for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)];
  return `ON-${ymd}-${s}`;
}

@Injectable({ providedIn: 'root' })
export class OrdersStore {
  private api = inject(Api);
  private cart = inject(CartStore);
  private catalog = inject(Catalog);
  private customer = inject(CustomerStore);
  private native = inject(Native);

  /** order numbers placed from this device (customers of the first app keep theirs) */
  readonly mine = signal<string[]>(store.get('v2_orders', store.get<string[]>('smo_orders', [])));
  readonly list = signal<Order[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  private lastStatus: Record<string, string> = store.get('v2_last_status', {});

  async refresh(): Promise<void> {
    const nos = this.mine();
    if (!nos.length) { this.list.set([]); return; }
    this.loading.set(true); this.error.set('');
    try {
      const rows = await this.api.rpc<Order[]>('my_orders', { nos });
      const list = (Array.isArray(rows) ? rows : []).map(o => ({ ...o, total: Number(o.total), items: o.items || [] }));
      list.forEach(o => this.noteStatus(o));
      this.list.set(list);
    } catch (e: any) { this.error.set(e?.message || 'تعذّر تحميل طلباتك'); }
    finally { this.loading.set(false); }
  }

  async get(no: string): Promise<Order | null> {
    const o = await this.api.rpc<Order | null>('order_by_no', { order_no: no });
    if (!o || !o.order_no) return null;
    const ord = { ...o, total: Number(o.total), items: o.items || [] };
    this.noteStatus(ord);
    this.list.update(l => l.some(x => x.order_no === ord.order_no) ? l.map(x => x.order_no === ord.order_no ? { ...x, ...ord } : x) : l);
    return ord;
  }

  /** follow an order placed from another device */
  async adopt(no: string): Promise<boolean> {
    const o = await this.get(no.trim().toUpperCase());
    if (!o) return false;
    if (!this.mine().includes(o.order_no)) { this.mine.update(m => [o.order_no, ...m].slice(0, 40)); store.set('v2_orders', this.mine()); }
    await this.refresh();
    return true;
  }

  async place(co: Checkout): Promise<string> {
    const c = this.customer.customer();
    if (!c?.phone || !c.name || !c.address) throw new Error('missing_customer');
    const lines = this.cart.lines();
    const items: OrderItem[] = lines.map(l => ({
      id: l.p.id, name: l.p.name, price: +l.p.price.toFixed(3), qty: l.q, line: +(l.p.price * l.q).toFixed(3),
    }));
    const a = c.address;
    const when = co.when === 'later' && co.slot ? `جدولة: ${co.slot}` : 'التوصيل الآن';
    const notes = [`الدفع: ${PAY_LABEL[co.pay]}`, when, (co.notes || '').trim()].filter(Boolean).join(' · ');
    const order_no = co.no || genOrderNo();
    const payload = {
      order_no, customer_name: c.name, customer_phone: c.phone,
      customer_address: [a.area, a.street, a.landmark ? 'قرب ' + a.landmark : ''].filter(Boolean).join('، '),
      lat: a.lat ?? null, lng: a.lng ?? null, notes, items,
      subtotal: +this.cart.subtotal().toFixed(3), delivery_fee: +this.cart.fee().toFixed(3), total: +this.cart.total().toFixed(3),
    };
    let no = order_no;
    try {
      const r = await this.api.rpc<{ order_no: string }>('place_order', payload);
      no = r?.order_no || order_no;
    } catch (e) {
      // the request may have reached the store before the network dropped: same number = same order, never a second one
      const there = await this.api.rpc<Order | null>('order_by_no', { order_no }).catch(() => null);
      if (!there?.order_no) throw e;
    }
    this.mine.update(m => [no, ...m.filter(x => x !== no)].slice(0, 40));
    store.set('v2_orders', this.mine());
    this.lastStatus[no] = 'pending'; store.set('v2_last_status', this.lastStatus);
    this.cart.clear();
    this.native.success();
    setTimeout(() => this.native.askPush(), 2200);
    this.refresh();
    return no;
  }

  private noteStatus(o: Order) {
    const prev = this.lastStatus[o.order_no];
    this.lastStatus[o.order_no] = o.status; store.set('v2_last_status', this.lastStatus);
    if (prev && prev !== o.status) {
      this.native.success();
      this.native.localAlert(`طلبك ${o.order_no}`, STATUS[o.status]?.label || o.status);
    }
  }

  forget() {
    this.mine.set([]); this.list.set([]); this.lastStatus = {};
    store.del('v2_orders'); store.del('smo_orders'); store.del('v2_last_status');
  }
}
