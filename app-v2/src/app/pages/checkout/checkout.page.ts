import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarOutline, cardOutline, cashOutline, chevronForward, chevronDown, flashOutline, locationOutline, phonePortraitOutline } from 'ionicons/icons';
import { errText } from '../../core/api.service';
import { CartStore } from '../../core/cart.store';
import { Catalog } from '../../core/catalog.store';
import { CustomerStore } from '../../core/customer.store';
import { Images } from '../../core/images.service';
import { OrdersStore, PayMethod, genOrderNo } from '../../core/orders.store';
import { Ui } from '../../core/ui.service';
import { JodPipe } from '../../ui/price.pipe';
import { SwipeConfirmComponent } from '../../ui/swipe-confirm.component';

const PAYS: { k: PayMethod; t: string; s: string; i: string }[] = [
  { k: 'cash', t: 'كاش', s: 'ادفع للمندوب عند الاستلام', i: 'cash-outline' },
  { k: 'card', t: 'بطاقة', s: 'المندوب يحمل جهاز الدفع', i: 'card-outline' },
  { k: 'cliq', t: 'CliQ', s: 'تحويل فوري عند الاستلام', i: 'phone-portrait-outline' },
];

function slots(): { k: string; day: string; t: string }[] {
  const out: { k: string; day: string; t: string }[] = [];
  const now = new Date(); const start = new Date(now); start.setMinutes(0, 0, 0); start.setHours(start.getHours() + 2);
  const fmt = (d: Date) => d.toLocaleTimeString('ar-JO', { hour: 'numeric', hour12: true }).replace(/\s/g, ' ');
  for (let i = 0; i < 10; i++) {
    const a = new Date(start.getTime() + i * 3600e3), b = new Date(a.getTime() + 3600e3);
    const today = a.toDateString() === now.toDateString();
    const day = today ? 'اليوم' : 'غدًا';
    out.push({ k: `${day} ${fmt(a)} – ${fmt(b)}`, day, t: `${fmt(a)} – ${fmt(b)}` });
  }
  return out;
}

@Component({
  selector: 'app-checkout',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonFooter, IonIcon, FormsModule, RouterLink, JodPipe, SwipeConfirmComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './checkout.page.html',
  styleUrl: './checkout.page.scss',
})
export class CheckoutPage {
  cart = inject(CartStore);
  customer = inject(CustomerStore);
  catalog = inject(Catalog);
  private orders = inject(OrdersStore);
  private images = inject(Images);
  private ui = inject(Ui);
  private router = inject(Router);

  pays = PAYS;
  slots = slots();
  pay = signal<PayMethod>('cash');
  when = signal<'now' | 'later'>('now');
  slot = signal(this.slots[0].k);
  notes = signal('');
  showItems = signal(false);
  busy = signal(false);
  /** one number per checkout, reused if the person retries after a network error */
  private orderNo = genOrderNo();
  settings = this.catalog.settings;
  thumbs = computed(() => this.cart.lines().slice(0, 5).map(l => this.images.url(l.p)).filter(Boolean) as string[]);
  ready = computed(() => this.cart.count() > 0 && this.cart.minLeft() <= 0 && this.settings().store_open && this.customer.hasAddress());

  constructor() { addIcons({ calendarOutline, cardOutline, cashOutline, chevronForward, chevronDown, flashOutline, locationOutline, phonePortraitOutline }); }

  ionViewWillEnter() {
    this.catalog.refreshSettings();
    if (!this.cart.count()) this.router.navigateByUrl('/tabs/cart', { replaceUrl: true });
    else if (!this.customer.signedIn()) this.router.navigateByUrl('/welcome?next=/checkout', { replaceUrl: true });
  }

  async place() {
    if (!this.ready() || this.busy()) return;
    this.busy.set(true);
    try {
      const no = await this.orders.place({ no: this.orderNo, pay: this.pay(), when: this.when(), slot: this.when() === 'later' ? this.slot() : undefined, notes: this.notes() });
      this.router.navigate(['/order', no, 'placed'], { replaceUrl: true });
    } catch (e) {
      this.ui.toast(errText(e) + ' — لم يُرسل الطلب، حاول مرة أخرى', 'err', 4000);
    } finally { this.busy.set(false); }
  }
}
