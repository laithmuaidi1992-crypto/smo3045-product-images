import { Injectable, computed, inject, signal } from '@angular/core';
import { Api } from './api.service';
import { norm } from './arabic';
import { NATIVE } from './env';
import { Images } from './images.service';
import { store } from './store';

export interface Product {
  id: string; name: string; price: number; stock: number; emoji: string;
  cat: number; unit: string; bulk: boolean; sm: string | null;
  /** normalised name for search */ n: string;
}
export interface Category { id: number; name: string; emoji: string; parent: number | null; sort: number; }
export interface StoreSettings {
  delivery_fee: number; min_order: number; free_delivery_from: number; eta: string;
  store_phone: string; store_open: boolean; closed_message: string;
  store_lat?: number; store_lng?: number;
}
interface CatalogCache {
  ts: number; cats: Category[]; rows: any[]; settings: Partial<StoreSettings> | null; top: string[]; catimg: Record<string, string>;
}

const CACHE_KEY = 'v2_catalog';
const TTL = 60 * 60 * 1000;
/** tobacco & hookah are not sold in the App Store build (guideline 1.4.3) */
const NATIVE_HIDE_CATS = new Set([39, 13, 24]);
const NATIVE_HIDE_RE = /(أرجيل|ارجيل|اراجيل|أراجيل|معسل|شيشة|سجائر|سيجار|تبغ)/;
const DEFAULTS: StoreSettings = {
  delivery_fee: 0.5, min_order: 2, free_delivery_from: 15, eta: '25–35 دقيقة', store_phone: '',
  store_open: true, closed_message: 'نعتذر، التوصيل متوقف مؤقتًا. سنعود قريبًا.',
};

@Injectable({ providedIn: 'root' })
export class Catalog {
  private api = inject(Api);
  private images = inject(Images);

  readonly status = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  readonly error = signal('');
  readonly progress = signal(0);
  readonly products = signal<Product[]>([]);
  readonly cats = signal<Category[]>([]);
  readonly settings = signal<StoreSettings>(DEFAULTS);
  readonly topIds = signal<string[]>([]);
  readonly catImg = signal<Record<string, string>>({});
  readonly loadedAt = signal(0);

  readonly byId = computed(() => new Map(this.products().map(p => [p.id, p])));
  /** top-level aisles that actually have something on the shelf */
  readonly aisles = computed(() => {
    const count = this.countByCat();
    const cats = this.cats();
    return cats
      .filter(c => !c.parent && ((count.get(c.id) || 0) > 0 || cats.some(s => s.parent === c.id && (count.get(s.id) || 0) > 0)))
      .sort((a, b) => a.sort - b.sort || a.id - b.id);
  });
  readonly countByCat = computed(() => {
    const m = new Map<number, number>();
    for (const p of this.products()) m.set(p.cat, (m.get(p.cat) || 0) + 1);
    return m;
  });
  readonly top = computed(() => {
    const by = this.byId();
    return this.topIds().map(id => by.get(id)).filter((p): p is Product => !!p);
  });

  subs(parentId: number): Category[] {
    const count = this.countByCat();
    return this.cats().filter(c => c.parent === parentId && (count.get(c.id) || 0) > 0).sort((a, b) => a.sort - b.sort || a.id - b.id);
  }
  aisleCount(id: number): number {
    const count = this.countByCat();
    return (count.get(id) || 0) + this.cats().filter(c => c.parent === id).reduce((a, c) => a + (count.get(c.id) || 0), 0);
  }
  productsIn(catId: number, subId: number | null = null): Product[] {
    const ids = new Set<number>(subId != null ? [subId] : [catId, ...this.cats().filter(c => c.parent === catId).map(c => c.id)]);
    return this.products().filter(p => ids.has(p.cat));
  }
  cat(id: number) { return this.cats().find(c => c.id === id); }
  /** picture for an aisle tile: the admin's chosen product, else the best-seller */
  aisleImage(id: number): string | null {
    const pid = this.catImg()[String(id)];
    const p = pid ? this.byId().get(pid) : this.productsIn(id)[0];
    return p ? this.images.url(p) : null;
  }

  search(q: string, limit = 120): Product[] {
    const nq = norm(q);
    if (nq.length < 1) return [];
    const toks = nq.split(' ').filter(Boolean);
    const scored: [number, Product][] = [];
    for (const p of this.products()) {
      if (!toks.every(t => p.n.includes(t))) continue;
      let s = 0;
      if (p.n.startsWith(nq)) s += 100;
      if (p.n.startsWith(toks[0])) s += 40;
      for (const t of toks) if (new RegExp(`(^| )${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(p.n)) s += 15;
      s -= p.n.length / 40;
      scored.push([s, p]);
    }
    return scored.sort((a, b) => b[0] - a[0]).slice(0, limit).map(x => x[1]);
  }

  async load(force = false): Promise<void> {
    const cached = store.get<CatalogCache | null>(CACHE_KEY, null);
    if (cached?.rows?.length) {
      this.apply(cached);
      if (!force && Date.now() - cached.ts < TTL) { this.status.set('ready'); return; }
    }
    if (!cached) this.status.set('loading');
    try {
      const meta = await this.api.rpc<any>('catalog_meta');
      const rows: any[] = [];
      let after = '';
      for (let i = 0; i < 12; i++) {
        const page = await this.api.rpc<any[]>('products_page', { after });
        rows.push(...(Array.isArray(page) ? page : []));
        this.progress.set(rows.length);
        if (!Array.isArray(page) || page.length < 1000) break;
        after = page[page.length - 1][0];
      }
      const data: CatalogCache = {
        ts: Date.now(),
        cats: (meta.cats || []).map((a: any[]) => ({ id: a[0], name: a[1], emoji: a[2] || '📦', parent: a[3], sort: a[4] ?? 0 })),
        rows,
        settings: meta.settings && typeof meta.settings === 'object' ? meta.settings : null,
        top: meta.top || [],
        catimg: meta.catimg || {},
      };
      store.set(CACHE_KEY, data);
      this.apply(data);
      this.status.set('ready');
      this.error.set('');
    } catch (e: any) {
      if (!this.products().length) { this.status.set('error'); this.error.set(e?.message || 'تعذّر تحميل المنتجات'); }
    }
  }

  private apply(d: CatalogCache) {
    let cats = d.cats;
    let prods: Product[] = d.rows.map(a => ({
      id: a[0], name: String(a[1] || '').trim(), price: Number(a[2]), stock: Number(a[3]), emoji: a[4] || '📦',
      cat: a[5], unit: a[6], bulk: !!a[7], sm: a[8] || null, n: norm(String(a[1] || '')),
    }));
    if (NATIVE) {
      cats = cats.filter(c => !NATIVE_HIDE_CATS.has(c.id) && !NATIVE_HIDE_CATS.has(c.parent ?? -1));
      prods = prods.filter(p => !NATIVE_HIDE_CATS.has(p.cat) && !NATIVE_HIDE_RE.test(p.name));
    }
    prods.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    this.cats.set(cats);
    this.products.set(prods);
    this.topIds.set(d.top || []);
    this.catImg.set(d.catimg || {});
    this.settings.set({ ...DEFAULTS, ...(d.settings || {}) } as StoreSettings);
    this.loadedAt.set(d.ts);
  }
}
