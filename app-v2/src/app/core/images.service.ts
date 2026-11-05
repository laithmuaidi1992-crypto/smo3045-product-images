import { Injectable, signal } from '@angular/core';
import { IMG_BASE, STORAGE_BASE } from './env';
import { store } from './store';

/** Product photos: the website hosts small square copies (img/<id>.jpg) listed in img/manifest.json;
 *  anything missing falls back to the storage bucket. */
@Injectable({ providedIn: 'root' })
export class Images {
  private manifest = signal<Record<string, string>>(store.get('v2_img_manifest', {}));

  constructor() { this.refresh(); }

  async refresh() {
    try {
      const r = await fetch(IMG_BASE + 'manifest.json', { cache: 'no-cache' });
      if (!r.ok) return;
      const m = await r.json();
      if (m && typeof m === 'object' && !Array.isArray(m)) { this.manifest.set(m); store.set('v2_img_manifest', m); }
    } catch {}
  }

  url(p: { id: string; sm: string | null } | null | undefined): string | null {
    if (!p) return null;
    const v = this.manifest()[p.id];
    if (v) return `${IMG_BASE}${encodeURIComponent(p.id)}.jpg?v=${encodeURIComponent(v)}`;
    if (p.sm) return STORAGE_BASE + p.sm;
    return null;
  }
}
