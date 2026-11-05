import { ChangeDetectionStrategy, Component, ElementRef, NgZone, computed, inject, input, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonRefresher, IonRefresherContent, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { bicycleOutline, callOutline, checkmark, closeCircleOutline, refreshOutline, storefrontOutline } from 'ionicons/icons';
import * as L from 'leaflet';
import { errText } from '../../core/api.service';
import { CartStore } from '../../core/cart.store';
import { Catalog } from '../../core/catalog.store';
import { STORE_LL } from '../../core/env';
import { Native } from '../../core/native.service';
import { Order, OrdersStore, STATUS, STEPS, isOpen } from '../../core/orders.store';
import { Ui } from '../../core/ui.service';
import { JodPipe } from '../../ui/price.pipe';

const POLL_MS = 15000;

@Component({
  selector: 'app-track',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonIcon, IonRefresher, IonRefresherContent, JodPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <ion-header [translucent]="true">
    <ion-toolbar>
      <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/orders" /></ion-buttons>
      <ion-title dir="ltr">{{ no() }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content [fullscreen]="true">
    <ion-refresher slot="fixed" (ionRefresh)="pull($event)"><ion-refresher-content /></ion-refresher>

    @if (notFound()) {
      <div class="empty">
        <ion-icon name="close-circle-outline" />
        <h2>لم نجد هذا الطلب</h2>
        <p>تأكد من رقم الطلب، أو تواصل مع المتجر.</p>
        <button class="btn primary" type="button" (click)="router.navigateByUrl('/tabs/orders')">طلباتي</button>
      </div>
    } @else if (order(); as o) {
      <section class="hero" [class]="'tone-' + meta().tone">
        <p class="eyebrow">{{ open() ? 'الحالة الآن' : 'الطلب' }}</p>
        <h1>{{ meta().label }}</h1>
        @if (open()) { <p class="sub">يتحدّث تلقائيًا · آخر تحديث {{ updated() }}</p> }
        @if (o.status !== 'cancelled') {
          <ol class="steps" [style.--p]="progress()">
            <span class="rail"><i></i></span>
            @for (s of steps; track s.key; let i = $index) {
              <li [class.done]="i < meta().step || o.status === 'delivered'" [class.now]="i === meta().step && o.status !== 'delivered'">
                <span class="dot">@if (i < meta().step || o.status === 'delivered') { <ion-icon name="checkmark" /> }</span>
                <small>{{ s.label }}</small>
              </li>
            }
          </ol>
        }
      </section>

      @if (o.status === 'out_for_delivery' || (o.customer_location_lat && open())) {
        <div class="mapCard"><div #map class="map"></div>
          @if (o.status === 'out_for_delivery') { <span class="ride"><ion-icon name="bicycle-outline" /> {{ o.assigned_driver ? o.assigned_driver + ' في الطريق' : 'المندوب في الطريق' }}</span> }
        </div>
      }

      <div class="wrap">
        <div class="acts">
          @if (catalog.settings().store_phone) {
            <a class="act" [href]="'tel:' + catalog.settings().store_phone"><ion-icon name="call-outline" /> اتصل بالمتجر</a>
          }
          @if (!open()) { <button class="act" type="button" (click)="reorder(o)"><ion-icon name="refresh-outline" /> اطلبه مرة ثانية</button> }
        </div>

        <section class="receipt">
          <h2 class="h-sec">{{ o.items.length }} صنف</h2>
          <ul>
            @for (i of o.items; track i.id) { <li><span class="q">{{ i.qty }}×</span><span class="n">{{ i.name }}</span><span class="price">{{ i.line | jod }}</span></li> }
          </ul>
          <div class="tot"><span>الإجمالي</span><b>{{ o.total | jod }} <small>د.أ</small></b></div>
          @if (o.customer_address) { <p class="meta"><b>العنوان</b>{{ o.customer_address }}</p> }
          @if (o.customer_notes) { <p class="meta"><b>تفاصيل</b>{{ o.customer_notes }}</p> }
          <p class="meta"><b>وقت الطلب</b>{{ when(o.created_at) }}</p>
        </section>
      </div>
      <div style="height: 40px"></div>
    } @else {
      <div class="wrap"><div class="skeleton" style="height:220px;border-radius:28px"></div><div class="skeleton" style="height:180px;border-radius:24px;margin-top:16px"></div></div>
    }
  </ion-content>`,
  styles: [`
    .hero { margin: 8px 16px 0; padding: 22px 20px 20px; border-radius: 28px; background: var(--navy); color: #fff; position: relative; overflow: hidden; }
    .hero::before { content: ''; position: absolute; inset: 0 0 auto; height: 4px; background: var(--red); }
    .hero.tone-fresh { background: var(--fresh); } .hero.tone-red { background: #5b1220; } .hero.tone-amber { background: #12307f; }
    .eyebrow { margin: 0; font-size: 13px; color: rgba(255,255,255,.7); }
    h1 { margin: 4px 0 0; font-size: 25px; font-weight: 700; line-height: 1.3; }
    .sub { margin: 6px 0 0; font-size: 12.5px; color: rgba(255,255,255,.65); }
    .steps { list-style: none; margin: 22px 0 0; padding: 0; display: grid; grid-template-columns: repeat(5, 1fr); position: relative; }
    .rail { position: absolute; top: 13px; inset-inline: 10%; height: 3px; background: rgba(255,255,255,.2); border-radius: 2px; }
    .rail i { position: absolute; inset-block: 0; right: 0; width: calc(var(--p) * 100%); background: #fff; border-radius: 2px; transition: width .8s var(--ease-out); }
    li { display: flex; flex-direction: column; align-items: center; gap: 8px; position: relative; z-index: 1; text-align: center; }
    .dot { width: 28px; height: 28px; border-radius: 50%; background: var(--navy); box-shadow: inset 0 0 0 3px rgba(255,255,255,.3); display: grid; place-items: center; font-size: 16px; }
    .tone-fresh .dot { background: var(--fresh); }
    li.done .dot { background: #fff; color: var(--navy); box-shadow: none; }
    li.now .dot { background: #fff; box-shadow: 0 0 0 6px rgba(255,255,255,.22); animation: beat 1.6s ease-in-out infinite; }
    li.now .dot::after { content: ''; width: 10px; height: 10px; border-radius: 50%; background: var(--red); }
    @keyframes beat { 50% { box-shadow: 0 0 0 11px rgba(255,255,255,.08); } }
    small { font-size: 11px; color: rgba(255,255,255,.75); line-height: 1.35; } li.now small, li.done small { color: #fff; font-weight: 600; }
    .mapCard { position: relative; margin: 14px 16px 0; height: 210px; border-radius: 24px; overflow: hidden; background: var(--aisle); }
    .map { position: absolute; inset: 0; }
    .ride { position: absolute; z-index: 500; bottom: 10px; inset-inline-start: 10px; padding: 8px 14px; border-radius: 999px; background: #fff; color: var(--navy); font-size: 13px; font-weight: 600; display: flex; gap: 6px; align-items: center; box-shadow: var(--shadow-float); }
    .wrap { padding: 16px; }
    .acts { display: flex; gap: 10px; margin-bottom: 16px; }
    .act { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 50px; border-radius: 999px; border: 0; background: var(--aisle); color: var(--navy); font: inherit; font-weight: 600; font-size: 14.5px; text-decoration: none; cursor: pointer; ion-icon { font-size: 19px; } }
    .receipt { padding: 18px; border-radius: 24px; background: var(--paper); box-shadow: inset 0 0 0 1px #ECE9DF; }
    .receipt ul { list-style: none; margin: 10px 0 0; padding: 0 0 12px; display: flex; flex-direction: column; gap: 9px; border-bottom: 2px dashed #D9D6CB; font-size: 14px;
      li { display: flex; flex-direction: row; align-items: baseline; gap: 8px; text-align: start; } .q { color: var(--fg-2); min-width: 26px; font-variant-numeric: tabular-nums; } .n { flex: 1; } }
    .receipt .tot { display: flex; justify-content: space-between; align-items: baseline; padding: 12px 0 6px; font-weight: 700; b { font-size: 22px; color: var(--navy); small { font-size: 12px; color: var(--fg-2); } } }
    .meta { margin: 10px 0 0; font-size: 13px; color: var(--fg-2); line-height: 1.6; display: flex; flex-direction: column; b { color: var(--fg); font-size: 12px; } }
    .empty { padding: 80px 30px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; ion-icon { font-size: 56px; color: var(--muted); } h2 { margin: 0; } p { margin: 0 0 10px; color: var(--fg-2); } }
  `],
})
export class TrackPage {
  no = input.required<string>();
  catalog = inject(Catalog);
  router = inject(Router);
  private orders = inject(OrdersStore);
  private cart = inject(CartStore);
  private native = inject(Native);
  private ui = inject(Ui);
  private zone = inject(NgZone);
  private mapEl = viewChild<ElementRef<HTMLElement>>('map');
  private map: L.Map | null = null;
  private timer: any;

  order = signal<Order | null>(null);
  notFound = signal(false);
  stamp = signal(Date.now());
  steps = STEPS;
  meta = computed(() => STATUS[this.order()?.status || 'pending']);
  open = computed(() => isOpen(this.order()?.status || 'pending'));
  progress = computed(() => this.order()?.status === 'delivered' ? 1 : Math.max(0, this.meta().step) / 4);
  updated = computed(() => new Date(this.stamp()).toLocaleTimeString('ar-JO', { hour: 'numeric', minute: '2-digit' }));

  async pull(e: Event) { await this.load(); (e.target as HTMLIonRefresherElement).complete(); }
  constructor() { addIcons({ bicycleOutline, callOutline, checkmark, closeCircleOutline, refreshOutline, storefrontOutline }); }

  ionViewWillEnter() { this.load(); this.timer = setInterval(() => { if (this.open() && !document.hidden) this.load(); }, POLL_MS); }
  ionViewWillLeave() { clearInterval(this.timer); }

  async load() {
    try {
      const o = await this.orders.get(this.no());
      if (!o) { this.notFound.set(true); return; }
      this.order.set(o); this.stamp.set(Date.now());
      setTimeout(() => this.drawMap(), 50);
    } catch (e) { if (!this.order()) this.ui.toast(errText(e), 'err'); }
  }

  private drawMap() {
    const el = this.mapEl()?.nativeElement, o = this.order();
    if (!el || !o) return;
    if (this.map && this.map.getContainer() !== el) { this.map.remove(); this.map = null; }
    if (this.map) return;
    this.zone.runOutsideAngular(() => {
      const s = this.catalog.settings() as any;
      const store: L.LatLngExpression = [Number(s.store_lat) || STORE_LL.lat, Number(s.store_lng) || STORE_LL.lng];
      const home: L.LatLngExpression | null = o.customer_location_lat && o.customer_location_lng ? [o.customer_location_lat, o.customer_location_lng] : null;
      const map = L.map(el, { zoomControl: false, attributionControl: false, dragging: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      const pin = (cls: string) => L.divIcon({ className: '', html: `<span class="mpin ${cls}"></span>`, iconSize: [22, 22], iconAnchor: [11, 11] });
      L.marker(store, { icon: pin('store') }).addTo(map);
      if (home) {
        L.marker(home, { icon: pin('home') }).addTo(map);
        L.polyline([store, home], { color: '#0A1F5C', weight: 3, dashArray: '2 8', lineCap: 'round' }).addTo(map);
        map.fitBounds(L.latLngBounds([store, home]), { padding: [40, 40], maxZoom: 16 });
      } else map.setView(store, 15);
      this.map = map;
    });
  }

  reorder(o: Order) {
    const n = this.cart.refill(o.items.map(i => ({ id: i.id, qty: i.qty })));
    if (!n) { this.ui.toast('أصناف هذا الطلب غير متوفرة حاليًا', 'err'); return; }
    this.native.success();
    this.ui.toast(n === o.items.length ? 'أضفنا الطلب كاملًا لسلتك' : `أضفنا ${n} من ${o.items.length} أصناف — الباقي غير متوفر`);
    this.router.navigateByUrl('/tabs/cart');
  }

  when(iso: string) {
    return new Date(iso).toLocaleString('ar-JO', { timeZone: 'Asia/Amman', weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
  }

  ngOnDestroy() { clearInterval(this.timer); this.map?.remove(); }
}
