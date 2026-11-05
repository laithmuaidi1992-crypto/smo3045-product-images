import { ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy, computed, inject, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { locate, navigateOutline } from 'ionicons/icons';
import * as L from 'leaflet';
import { Catalog } from '../../core/catalog.store';
import { CustomerStore } from '../../core/customer.store';
import { STORE_LL } from '../../core/env';
import { Native } from '../../core/native.service';
import { Ui } from '../../core/ui.service';

const AREAS = ['حي الحصن', 'شارع الجامعة', 'دوار الجامعة', 'جامعة اليرموك', 'حي البارحة', 'دوار القبة', 'شارع بغداد', 'وسط البلد', 'مجمع عمان الجديد',
  'شارع شفيق ارشيدات', 'إيدون', 'جنوب إربد', 'الحي الشرقي', 'الحي الجنوبي', 'حي الأطباء', 'النرجس', 'المدينة الصناعية'];
const MAX_KM = 12;

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

@Component({
  selector: 'app-address',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonFooter, IonIcon, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <ion-header [translucent]="true">
    <ion-toolbar>
      <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/home" /></ion-buttons>
      <ion-title>عنوان التوصيل</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content [fullscreen]="true">
    <div class="mapBox">
      <div #map class="map"></div>
      <div class="pin" [class.lift]="moving()" aria-hidden="true"><span class="head"></span><span class="stem"></span><span class="shadow"></span></div>
      <button class="me" type="button" (click)="locateMe()" [class.busy]="locating()" aria-label="موقعي الحالي"><ion-icon name="locate" /></button>
      <div class="hint" [class.bad]="tooFar()">
        @if (tooFar()) { هذا الموقع يبعد {{ dist().toFixed(1) }} كم — خارج نطاق التوصيل }
        @else if (picked()) { <ion-icon name="navigate-outline" /> يبعد {{ dist().toFixed(1) }} كم عن المتجر }
        @else { حرّك الخريطة حتى يقف الدبوس على باب بيتك }
      </div>
    </div>

    <form class="form" (ngSubmit)="save()">
      <div class="field">
        <label>الحي / المنطقة</label>
        <input name="area" [ngModel]="area()" (ngModelChange)="area.set($event)" placeholder="اكتب الحي أو اختر" autocomplete="address-level3" />
        <div class="areas">
          @for (a of areas; track a) { <button type="button" class="chip" [class.on]="area() === a" (click)="area.set(a)">{{ a }}</button> }
        </div>
      </div>
      <div class="field">
        <label>الشارع ورقم البناية</label>
        <input name="street" [ngModel]="street()" (ngModelChange)="street.set($event)" placeholder="مثال: شارع الجامعة، بناية 12، طابق 3" autocomplete="street-address" />
      </div>
      <div class="field">
        <label>أقرب معلم <span class="opt">(اختياري)</span></label>
        <input name="landmark" [ngModel]="landmark()" (ngModelChange)="landmark.set($event)" placeholder="مقابل مسجد، صيدلية…" />
      </div>
      @if (err()) { <p class="err">{{ err() }}</p> }
      <div style="height: 90px"></div>
    </form>
  </ion-content>
  <ion-footer class="go">
    <button class="btn primary block" type="button" (click)="save()">حفظ العنوان</button>
  </ion-footer>`,
  styles: [`
    .mapBox { position: relative; height: 46vh; min-height: 300px; background: var(--aisle); }
    .map { position: absolute; inset: 0; }
    .pin { position: absolute; left: 50%; top: 50%; z-index: 500; pointer-events: none; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; transition: transform .25s var(--ease-out); }
    .pin.lift { transform: translate(-50%, calc(-100% - 12px)); }
    .head { width: 30px; height: 30px; border-radius: 50%; background: var(--red); border: 4px solid #fff; box-shadow: 0 6px 16px rgba(200,16,46,.45); }
    .stem { width: 3px; height: 16px; background: var(--navy); border-radius: 2px; margin-top: -2px; }
    .shadow { width: 14px; height: 5px; border-radius: 50%; background: rgba(10,31,92,.3); margin-top: 1px; transition: transform .25s; }
    .pin.lift .shadow { transform: translateY(12px) scale(.7); }
    .me { position: absolute; z-index: 500; bottom: 62px; inset-inline-end: 14px; width: 48px; height: 48px; border-radius: 50%; border: 0; background: #fff; color: var(--navy); font-size: 22px; display: grid; place-items: center; box-shadow: var(--shadow-float); cursor: pointer; }
    .me.busy ion-icon { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .hint { position: absolute; z-index: 500; bottom: 12px; inset-inline: 14px; min-height: 40px; padding: 8px 14px; border-radius: 999px; background: rgba(255,255,255,.95); color: var(--fg); font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 6px 18px rgba(10,31,92,.14); text-align: center; }
    .hint.bad { background: var(--red); color: #fff; }
    .form { padding: 20px 20px 0; display: flex; flex-direction: column; gap: 18px; }
    .areas { display: flex; gap: 8px; overflow-x: auto; padding: 4px 0 2px; scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
    .opt { font-weight: 400; color: var(--muted); }
    .err { margin: 0; color: var(--red); font-size: 14px; font-weight: 500; }
    .go { padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); background: rgba(255,255,255,.95); border-top: 1px solid var(--line); }
  `],
})
export class AddressPage implements OnDestroy {
  next = input<string>('');
  private customer = inject(CustomerStore);
  private catalog = inject(Catalog);
  private native = inject(Native);
  private ui = inject(Ui);
  private router = inject(Router);
  private zone = inject(NgZone);
  private mapEl = viewChild.required<ElementRef<HTMLElement>>('map');
  private map: L.Map | null = null;

  areas = AREAS;
  private a = this.customer.customer()?.address;
  area = signal(this.a?.area || '');
  street = signal(this.a?.street || '');
  landmark = signal(this.a?.landmark || '');
  center = signal<{ lat: number; lng: number }>(this.a?.lat && this.a?.lng ? { lat: +this.a.lat, lng: +this.a.lng } : this.storeLL());
  picked = signal(!!(this.a?.lat && this.a?.lng));
  moving = signal(false);
  locating = signal(false);
  err = signal('');
  dist = computed(() => km(this.center(), this.storeLL()));
  tooFar = computed(() => this.picked() && this.dist() > MAX_KM);

  constructor() { addIcons({ locate, navigateOutline }); }

  private storeLL() {
    const s = this.catalog?.settings?.();
    return { lat: Number(s?.store_lat) || STORE_LL.lat, lng: Number(s?.store_lng) || STORE_LL.lng };
  }

  ionViewDidEnter() {
    if (this.map) { this.map.invalidateSize(); return; }
    this.zone.runOutsideAngular(() => {
      const c = this.center();
      const map = L.map(this.mapEl().nativeElement, { zoomControl: false, attributionControl: true }).setView([c.lat, c.lng], this.picked() ? 17 : 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
      map.on('movestart', () => this.zone.run(() => this.moving.set(true)));
      map.on('moveend', () => this.zone.run(() => {
        this.moving.set(false);
        const m = map.getCenter(); this.center.set({ lat: m.lat, lng: m.lng }); this.picked.set(true); this.native.selection();
      }));
      this.map = map;
      setTimeout(() => map.invalidateSize(), 120);
    });
    if (!this.picked()) this.locateMe(true);
  }

  async locateMe(silent = false) {
    this.locating.set(true);
    try {
      const ll = await this.native.locate();
      this.map?.flyTo([ll.lat, ll.lng], 17, { duration: .9 });
      this.center.set(ll); this.picked.set(true);
    } catch {
      if (!silent) this.ui.toast('لم نتمكن من تحديد موقعك. اسمح للتطبيق بالوصول للموقع أو حرّك الخريطة يدويًا', 'err', 3500);
    } finally { this.locating.set(false); }
  }

  save() {
    this.err.set('');
    if (!this.area().trim()) { this.err.set('اكتب الحي أو اختره من القائمة.'); this.native.warn(); return; }
    if (!this.street().trim()) { this.err.set('اكتب الشارع أو رقم البناية حتى يصل المندوب.'); this.native.warn(); return; }
    if (this.tooFar()) { this.err.set(`هذا الموقع يبعد ${this.dist().toFixed(0)} كم عن المتجر، خارج نطاق التوصيل. حرّك الدبوس لعنوانك في إربد.`); this.native.warn(); return; }
    const c = this.center();
    this.customer.setAddress({
      area: this.area().trim(), street: this.street().trim(), landmark: this.landmark().trim() || undefined,
      lat: this.picked() ? +c.lat.toFixed(6) : undefined, lng: this.picked() ? +c.lng.toFixed(6) : undefined,
    });
    this.native.success();
    this.ui.toast('حُفظ عنوانك');
    this.router.navigateByUrl(this.next() || '/tabs/home', { replaceUrl: !!this.next() });
  }

  ngOnDestroy() { this.map?.remove(); this.map = null; }
}
