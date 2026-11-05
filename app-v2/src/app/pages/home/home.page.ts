import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonIcon, IonRefresher, IonRefresherContent, IonToolbar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForward, chevronDown, locationOutline, refreshOutline, searchOutline, timeOutline } from 'ionicons/icons';
import { greeting } from '../../core/arabic';
import { CartStore } from '../../core/cart.store';
import { Catalog } from '../../core/catalog.store';
import { CustomerStore } from '../../core/customer.store';
import { Images } from '../../core/images.service';
import { OrdersStore, STATUS, STEPS, isOpen } from '../../core/orders.store';
import { Ui } from '../../core/ui.service';
import { MarkComponent } from '../../ui/mark.component';
import { JodPipe } from '../../ui/price.pipe';
import { ProductCardComponent } from '../../ui/product-card.component';

@Component({
  selector: 'app-home',
  imports: [IonContent, IonHeader, IonToolbar, IonIcon, IonRefresher, IonRefresherContent, RouterLink, MarkComponent, ProductCardComponent, JodPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  catalog = inject(Catalog);
  cart = inject(CartStore);
  customer = inject(CustomerStore);
  orders = inject(OrdersStore);
  private images = inject(Images);
  private ui = inject(Ui);
  private router = inject(Router);

  scrolled = signal(false);
  hello = computed(() => {
    const n = this.customer.firstName();
    return n ? `${greeting()}، ${n}` : greeting();
  });
  settings = this.catalog.settings;
  liveOrder = computed(() => this.orders.list().find(o => isOpen(o.status)) ?? null);
  lastDelivered = computed(() => this.orders.list().find(o => o.status === 'delivered' && o.items?.length) ?? null);
  aisles = computed(() => this.catalog.aisles().map(a => ({ ...a, img: this.catalog.aisleImage(a.id), count: this.catalog.aisleCount(a.id) })));
  rails = computed(() => this.catalog.aisles().slice(0, 4).map(a => ({ aisle: a, items: this.catalog.productsIn(a.id).slice(0, 12) })).filter(r => r.items.length));
  top = computed(() => this.catalog.top().slice(0, 8));
  status = STATUS;
  steps = STEPS;

  constructor() { addIcons({ chevronForward, chevronDown, locationOutline, refreshOutline, searchOutline, timeOutline }); }

  onScroll(ev: CustomEvent) { this.scrolled.set((ev.detail?.scrollTop || 0) > 120); }

  async refresh(ev: CustomEvent) {
    await Promise.all([this.catalog.load(true), this.orders.refresh()]);
    (ev.target as HTMLIonRefresherElement).complete();
  }
  stepOf(s: string) { return Math.max(0, STATUS[s as keyof typeof STATUS]?.step ?? 0); }
  thumbs(o: { items: { id: string }[] }) {
    const by = this.catalog.byId();
    return o.items.slice(0, 4).map(i => { const p = by.get(i.id); return p ? this.images.url(p) : null; }).filter(Boolean) as string[];
  }
  reorder() {
    const o = this.lastDelivered(); if (!o) return;
    const n = this.cart.refill(o.items);
    if (n) { this.ui.toast(`أعدنا ${n} أصناف إلى سلتك`); this.router.navigateByUrl('/tabs/cart'); }
    else this.ui.toast('أصناف هذا الطلب غير متوفرة حاليًا', 'err');
  }
  goAddress() { this.router.navigateByUrl(this.customer.signedIn() ? '/address' : '/welcome?next=/address'); }
}
