import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Catalog, Product } from './catalog.store';
import { Native } from './native.service';
import { store } from './store';

export interface CartLine { p: Product; q: number; }

const KEY = 'v2_cart';

/** the most of one product a person can order: what is on the shelf (POS stock can lag, so 0/negative still allows a few), capped at 99 */
export function maxQty(p: Product): number { return p.stock > 0 ? Math.min(p.stock, 99) : 5; }

@Injectable({ providedIn: 'root' })
export class CartStore {
  private catalog = inject(Catalog);
  private native = inject(Native);

  /** id → quantity; customers of the first app keep their cart */
  readonly qty = signal<Record<string, number>>(store.get(KEY, store.get<Record<string, number>>('smo_cart', {})));
  /** bumps whenever something is added — the cart bar listens to animate */
  readonly pulse = signal(0);

  readonly lines = computed<CartLine[]>(() => {
    const by = this.catalog.byId();
    return Object.entries(this.qty())
      .map(([id, q]) => ({ p: by.get(id)!, q }))
      .filter(l => !!l.p && l.q > 0);
  });
  readonly count = computed(() => this.lines().reduce((a, l) => a + l.q, 0));
  readonly kinds = computed(() => this.lines().length);
  readonly subtotal = computed(() => this.lines().reduce((a, l) => a + l.p.price * l.q, 0));
  readonly fee = computed(() => {
    const s = this.catalog.settings(); const sub = this.subtotal();
    const free = Number(s.free_delivery_from) || 0;
    return sub > 0 && free > 0 && sub >= free ? 0 : Number(s.delivery_fee) || 0;
  });
  readonly total = computed(() => this.subtotal() + (this.subtotal() > 0 ? this.fee() : 0));
  readonly freeLeft = computed(() => Math.max(0, (Number(this.catalog.settings().free_delivery_from) || 0) - this.subtotal()));
  readonly freeProgress = computed(() => {
    const f = Number(this.catalog.settings().free_delivery_from) || 0;
    return f > 0 ? Math.min(1, this.subtotal() / f) : 1;
  });
  readonly minLeft = computed(() => Math.max(0, (Number(this.catalog.settings().min_order) || 0) - this.subtotal()));

  constructor() {
    effect(() => store.set(KEY, this.qty()));
    // drop products that left the shelf once the catalogue is fresh
    effect(() => {
      if (this.catalog.status() !== 'ready') return;
      const by = this.catalog.byId(); const cur = this.qty();
      const clean = Object.fromEntries(Object.entries(cur).filter(([id]) => by.has(id)));
      if (Object.keys(clean).length !== Object.keys(cur).length) this.qty.set(clean);
    });
  }

  of(id: string) { return this.qty()[id] || 0; }

  set(p: Product, q: number) {
    const max = maxQty(p);
    const next = Math.max(0, Math.min(q, max));
    const cur = { ...this.qty() };
    const before = cur[p.id] || 0;
    if (next === before) { if (q > max) this.native.warn(); return; }
    if (next === 0) delete cur[p.id]; else cur[p.id] = next;
    this.qty.set(cur);
    if (next > before) { this.pulse.update(x => x + 1); this.native.tap(); } else this.native.selection();
  }
  add(p: Product, d = 1) { this.set(p, this.of(p.id) + d); }
  remove(p: Product) { this.set(p, 0); }
  clear() { this.qty.set({}); }
  /** put a previous order back in the cart (what is still on the shelf) */
  refill(items: { id: string; qty: number }[]): number {
    const by = this.catalog.byId(); const cur = { ...this.qty() }; let n = 0;
    for (const it of items) {
      const p = by.get(it.id); if (!p) continue;
      cur[p.id] = Math.min(maxQty(p), (cur[p.id] || 0) + (Number(it.qty) || 1)); n++;
    }
    this.qty.set(cur); if (n) this.pulse.update(x => x + 1);
    return n;
  }
}
