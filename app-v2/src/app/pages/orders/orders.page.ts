import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonIcon, IonRefresher, IonRefresherContent, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBack, receiptOutline, refreshOutline, searchOutline } from 'ionicons/icons';
import { CartStore } from '../../core/cart.store';
import { Native } from '../../core/native.service';
import { Order, OrdersStore, STATUS, isOpen } from '../../core/orders.store';
import { Ui } from '../../core/ui.service';
import { JodPipe } from '../../ui/price.pipe';

@Component({
  selector: 'app-orders',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, IonRefresher, IonRefresherContent, FormsModule, RouterLink, JodPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <ion-header [translucent]="true"><ion-toolbar><ion-title>طلباتي</ion-title></ion-toolbar></ion-header>
  <ion-content [fullscreen]="true">
    <ion-header collapse="condense"><ion-toolbar><ion-title size="large">طلباتي</ion-title></ion-toolbar></ion-header>
    <ion-refresher slot="fixed" (ionRefresh)="pull($event)"><ion-refresher-content /></ion-refresher>
    <div class="wrap">
      @if (live().length) {
        <h2 class="h-sec">قيد التنفيذ</h2>
        @for (o of live(); track o.order_no) {
          <a class="live press" [routerLink]="['/order', o.order_no]">
            <div class="lt"><span class="pulse"></span><b>{{ st(o).label }}</b></div>
            <div class="bar"><i [style.width.%]="(st(o).step + 1) * 20"></i></div>
            <div class="lb"><span dir="ltr">{{ o.order_no }}</span><span>{{ o.items.length }} صنف · <b class="price">{{ o.total | jod }}</b> د.أ</span><ion-icon name="chevron-back" /></div>
          </a>
        }
      }

      @if (past().length) {
        <h2 class="h-sec">السابقة</h2>
        <div class="list">
          @for (o of past(); track o.order_no) {
            <div class="row">
              <a class="rmain" [routerLink]="['/order', o.order_no]">
                <span class="tag" [class]="'t-' + st(o).tone">{{ st(o).short }}</span>
                <b>{{ day(o.created_at) }}</b>
                <span class="names">{{ names(o) }}</span>
                <span class="sum"><b class="price">{{ o.total | jod }}</b> د.أ · {{ o.items.length }} صنف</span>
              </a>
              <button class="again" type="button" (click)="reorder(o)" aria-label="اطلبه مرة ثانية"><ion-icon name="refresh-outline" /><small>كرّر</small></button>
            </div>
          }
        </div>
      }

      @if (!orders.list().length && !orders.loading()) {
        <div class="empty">
          <ion-icon name="receipt-outline" />
          <h2>لا طلبات بعد</h2>
          <p>أول طلب يصل بابك خلال نصف ساعة تقريبًا.</p>
          <a class="btn primary" routerLink="/tabs/home">ابدأ التسوّق</a>
        </div>
      }
      @if (orders.loading() && !orders.list().length) { @for (i of [1,2,3]; track i) { <div class="skeleton" style="height:96px;border-radius:22px;margin-bottom:12px"></div> } }
      @if (orders.error()) { <p class="err">{{ orders.error() }}</p> }

      <form class="follow" (ngSubmit)="follow()">
        <label for="fno">طلبت من جهاز آخر؟ تابع برقم الطلب</label>
        <div class="fr">
          <input id="fno" name="fno" dir="ltr" [ngModel]="no()" (ngModelChange)="no.set($event)" placeholder="ON-261105-AB12" autocapitalize="characters" autocomplete="off" />
          <button class="btn primary sm" type="submit" [disabled]="busy()"><ion-icon name="search-outline" /></button>
        </div>
      </form>
      <div style="height: 30px"></div>
    </div>
  </ion-content>`,
  styles: [`
    .wrap { padding: 4px 16px 0; display: flex; flex-direction: column; gap: 12px; }
    .h-sec { margin-top: 8px; }
    .live { display: flex; flex-direction: column; gap: 12px; padding: 18px; border-radius: 24px; background: var(--navy); color: #fff; text-decoration: none; position: relative; overflow: hidden;
      &::before { content: ''; position: absolute; inset: 0 0 auto; height: 3px; background: var(--red); } }
    .lt { display: flex; align-items: center; gap: 10px; b { font-size: 17px; } }
    .pulse { width: 10px; height: 10px; border-radius: 50%; background: #4ADE80; box-shadow: 0 0 0 0 rgba(74,222,128,.6); animation: p 1.8s infinite; }
    @keyframes p { 70% { box-shadow: 0 0 0 10px rgba(74,222,128,0); } 100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); } }
    .bar { height: 5px; border-radius: 3px; background: rgba(255,255,255,.18); overflow: hidden; i { display: block; height: 100%; background: #fff; border-radius: 3px; margin-inline-start: auto; } }
    .lb { display: flex; align-items: center; gap: 10px; font-size: 13px; color: rgba(255,255,255,.75); span:nth-child(2) { flex: 1; text-align: end; } b { color: #fff; } }
    .list { display: flex; flex-direction: column; border-radius: 24px; background: var(--aisle); overflow: hidden; }
    .row { display: flex; align-items: stretch; & + .row { border-top: 1px solid var(--aisle-2); } }
    .rmain { flex: 1; min-width: 0; display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; padding: 14px 16px; color: var(--fg); text-decoration: none;
      b { font-size: 15px; grid-row: 1; grid-column: 1; } .tag { grid-row: 1; grid-column: 2; }
      .names { grid-column: 1 / -1; font-size: 13px; color: var(--fg-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .sum { grid-column: 1 / -1; font-size: 13px; color: var(--fg-2); b { font-size: 13px; color: var(--fg); } } }
    .tag { font-size: 11.5px; font-weight: 600; padding: 3px 10px; border-radius: 999px; background: #fff; color: var(--navy); align-self: start; }
    .t-fresh { color: var(--fresh); } .t-red { color: var(--red); }
    .again { width: 70px; border: 0; border-inline-start: 1px solid var(--aisle-2); background: none; color: var(--navy); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; cursor: pointer; ion-icon { font-size: 21px; } small { font-size: 11.5px; font-weight: 600; } }
    .empty { padding: 50px 20px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; ion-icon { font-size: 54px; color: var(--navy); opacity: .3; } h2 { margin: 0; font-size: 21px; } p { margin: 0 0 12px; color: var(--fg-2); } }
    .err { color: var(--red); font-size: 14px; }
    .follow { margin-top: 18px; padding: 16px; border-radius: 22px; box-shadow: inset 0 0 0 1px var(--line); display: flex; flex-direction: column; gap: 10px;
      label { font-size: 13.5px; font-weight: 600; color: var(--fg-2); }
      .fr { display: flex; gap: 8px; input { flex: 1; min-width: 0; height: 48px; padding: 0 14px; border-radius: 14px; border: 0; background: var(--aisle); font: inherit; font-size: 16px; letter-spacing: .04em; text-transform: uppercase; } .btn { width: 52px; padding: 0; font-size: 20px; } } }
  `],
})
export class OrdersPage {
  orders = inject(OrdersStore);
  private cart = inject(CartStore);
  private native = inject(Native);
  private ui = inject(Ui);
  private router = inject(Router);
  no = signal('');
  busy = signal(false);
  live = computed(() => this.orders.list().filter(o => isOpen(o.status)));
  past = computed(() => this.orders.list().filter(o => !isOpen(o.status)));

  async pull(e: Event) { await this.orders.refresh(); (e.target as HTMLIonRefresherElement).complete(); }
  constructor() { addIcons({ chevronBack, receiptOutline, refreshOutline, searchOutline }); }
  ionViewWillEnter() { this.orders.refresh(); }

  st(o: Order) { return STATUS[o.status] || STATUS.pending; }
  names(o: Order) { return o.items.map(i => i.name).join('، '); }
  day(iso: string) {
    const d = new Date(iso), now = new Date();
    const diff = Math.floor((now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
    if (diff === 0) return 'اليوم ' + d.toLocaleTimeString('ar-JO', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Amman' });
    if (diff === 1) return 'أمس';
    return d.toLocaleDateString('ar-JO', { day: 'numeric', month: 'long', timeZone: 'Asia/Amman' });
  }

  reorder(o: Order) {
    const n = this.cart.refill(o.items.map(i => ({ id: i.id, qty: i.qty })));
    if (!n) { this.ui.toast('أصناف هذا الطلب غير متوفرة حاليًا', 'err'); return; }
    this.native.success();
    this.ui.toast(n === o.items.length ? 'أضفنا الطلب كاملًا لسلتك' : `أضفنا ${n} من ${o.items.length} أصناف — الباقي غير متوفر`);
    this.router.navigateByUrl('/tabs/cart');
  }

  async follow() {
    const v = this.no().trim().toUpperCase();
    if (!/^ON-\d{6}-[A-Z0-9]{4}$/.test(v)) { this.ui.toast('اكتب رقم الطلب كما وصلك، مثل ON-261105-AB12', 'err'); return; }
    this.busy.set(true);
    try {
      if (await this.orders.adopt(v)) { this.no.set(''); this.router.navigate(['/order', v]); }
      else this.ui.toast('لم نجد طلبًا بهذا الرقم', 'err');
    } catch { this.ui.toast('تعذّر الاتصال، حاول مرة أخرى', 'err'); }
    finally { this.busy.set(false); }
  }
}
