import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { bag, bagOutline, grid, gridOutline, home, homeOutline, person, personOutline, receipt, receiptOutline } from 'ionicons/icons';
import { CartStore } from '../../core/cart.store';
import { Native } from '../../core/native.service';
import { OrdersStore, isOpen } from '../../core/orders.store';

@Component({
  selector: 'app-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <ion-tabs (ionTabsWillChange)="native.selection()">
    <ion-tab-bar slot="bottom">
      <ion-tab-button tab="home"><ion-icon name="home-outline" class="off" /><ion-icon name="home" class="on" /><ion-label>الرئيسية</ion-label></ion-tab-button>
      <ion-tab-button tab="aisles"><ion-icon name="grid-outline" class="off" /><ion-icon name="grid" class="on" /><ion-label>الأقسام</ion-label></ion-tab-button>
      <ion-tab-button tab="cart" class="cartTab">
        <span class="bagWrap" data-cart-target>
          <ion-icon name="bag-outline" class="off" /><ion-icon name="bag" class="on" />
          @if (cart.count() > 0) { <span class="badge">{{ cart.count() > 99 ? '99+' : cart.count() }}</span> }
        </span>
        <ion-label>السلة</ion-label>
      </ion-tab-button>
      <ion-tab-button tab="orders">
        <span class="bagWrap">
          <ion-icon name="receipt-outline" class="off" /><ion-icon name="receipt" class="on" />
          @if (live()) { <span class="live" aria-label="لديك طلب جارٍ"></span> }
        </span>
        <ion-label>طلباتي</ion-label>
      </ion-tab-button>
      <ion-tab-button tab="account"><ion-icon name="person-outline" class="off" /><ion-icon name="person" class="on" /><ion-label>حسابي</ion-label></ion-tab-button>
    </ion-tab-bar>
  </ion-tabs>`,
  styles: [`
    ion-tab-bar { height: calc(60px + env(safe-area-inset-bottom)); backdrop-filter: saturate(1.6) blur(18px); -webkit-backdrop-filter: saturate(1.6) blur(18px); border-top: 1px solid var(--line); }
    ion-tab-button { --color: var(--muted); --color-selected: var(--navy); font-weight: 500; }
    ion-tab-button ion-label { font-size: 10.5px; margin-top: 3px; font-weight: 600; }
    ion-tab-button ion-icon { font-size: 23px; }
    ion-tab-button .on { display: none; }
    ion-tab-button.tab-selected .on { display: block; }
    ion-tab-button.tab-selected .off { display: none; }
    .bagWrap { position: relative; display: grid; place-items: center; }
    .badge { position: absolute; top: -6px; inset-inline-end: -12px; min-width: 19px; height: 19px; padding: 0 5px; border-radius: 999px; background: var(--red); color: #fff;
      font-size: 11px; font-weight: 700; display: grid; place-items: center; font-variant-numeric: tabular-nums; border: 2px solid #fff; animation: pop .35s cubic-bezier(.34,1.56,.64,1); }
    .live { position: absolute; top: -2px; inset-inline-end: -4px; width: 9px; height: 9px; border-radius: 50%; background: var(--red); box-shadow: 0 0 0 0 rgba(200,16,46,.5); animation: ping 1.6s infinite; }
    @keyframes ping { 70% { box-shadow: 0 0 0 8px rgba(200,16,46,0); } 100% { box-shadow: 0 0 0 0 rgba(200,16,46,0); } }
    @keyframes pop { from { transform: scale(.4); } }
  `],
})
export class TabsPage {
  cart = inject(CartStore);
  native = inject(Native);
  private orders = inject(OrdersStore);
  live = computed(() => this.orders.list().some(o => isOpen(o.status)));
  constructor() {
    addIcons({ home, homeOutline, grid, gridOutline, bag, bagOutline, receipt, receiptOutline, person, personOutline });
    this.orders.refresh();
  }
}
