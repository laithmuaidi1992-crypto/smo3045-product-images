import { Injectable, computed, inject, signal } from '@angular/core';
import { Api } from './api.service';
import { NATIVE } from './env';
import { Native } from './native.service';
import { store } from './store';

export interface Address { area: string; street: string; landmark?: string; lat?: number; lng?: number; }
export interface Customer { phone: string; name?: string; address?: Address; }

const KEY = 'v2_customer';
export const PHONE_RE = /^07[789]\d{7}$/;

/** Normalise any Jordanian mobile the person types: 079…, 79…, +962 79…, 00962 79… */
export function normPhone(v: string): string | null {
  let d = (v || '').replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x0660)).replace(/\D/g, '');
  if (d.startsWith('00962')) d = d.slice(5);
  if (d.startsWith('962')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return /^7[789]\d{7}$/.test(d) ? '0' + d : null;
}

@Injectable({ providedIn: 'root' })
export class CustomerStore {
  private api = inject(Api);
  private native = inject(Native);

  /** existing customers of the first app keep their details */
  readonly customer = signal<Customer | null>(store.get<Customer | null>(KEY, store.get<Customer | null>('smo_customer', null)));
  readonly signedIn = computed(() => !!this.customer()?.phone && !!this.customer()?.name);
  readonly hasAddress = computed(() => !!this.customer()?.address?.area && !!this.customer()?.address?.street);
  readonly firstName = computed(() => (this.customer()?.name || '').trim().split(/\s+/)[0] || '');
  readonly addressLine = computed(() => {
    const a = this.customer()?.address;
    return a ? [a.area, a.street].filter(Boolean).join('، ') : '';
  });

  constructor() {
    this.native.onToken = () => this.savePushToken();
    this.heartbeat();
  }

  private save(c: Customer | null) { this.customer.set(c); store.set(KEY, c); }

  setIdentity(phone: string, name: string) {
    this.save({ ...(this.customer() || {}), phone, name: name.trim() });
    this.register();
  }
  setAddress(a: Address) {
    const c = this.customer(); if (!c) return;
    this.save({ ...c, address: a });
    this.register();
  }

  register() {
    const c = this.customer(); if (!c?.phone) return;
    const a = c.address || ({} as Address);
    this.api.rpc('register', {
      phone: c.phone, name: c.name || null, area: a.area || null, street: a.street || null, landmark: a.landmark || null,
      lat: a.lat ?? null, lng: a.lng ?? null, source: NATIVE ? 'ios' : 'web',
    }).catch(() => {});
    this.savePushToken();
  }
  private heartbeat() {
    const c = this.customer(); if (!c?.phone) return;
    const last = store.get<number>('v2_seen', 0);
    if (Date.now() - last < 6 * 3600 * 1000) return;
    store.set('v2_seen', Date.now());
    this.api.rpc('seen', { phone: c.phone, source: NATIVE ? 'ios' : 'web' }).catch(() => {});
  }
  savePushToken() {
    const t = this.native.pushToken, c = this.customer();
    if (t && c?.phone) this.api.rpc('push_register', { phone: c.phone, token: t, platform: 'ios' }).catch(() => {});
  }

  signOut() {
    const t = this.native.pushToken;
    if (t) this.api.rpc('push_unregister', { token: t }).catch(() => {});
    this.save(null);
  }
  async deleteAccount() {
    const c = this.customer(); if (!c?.phone) return;
    try { await this.api.rpc('delete_account', { phone: c.phone, name: c.name || '' }); }
    catch (e: any) { if (!/account_not_found/.test(e?.message || '')) throw e; }
    store.del('v2_orders'); store.del('smo_orders'); store.del('v2_last_status');
    this.save(null);
  }
}
