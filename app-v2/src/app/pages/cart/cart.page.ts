import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AlertController, IonContent, IonFooter, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { bicycleOutline, chevronBack, sparklesOutline, trashOutline } from 'ionicons/icons';
import { CartStore } from '../../core/cart.store';
import { Catalog, Product } from '../../core/catalog.store';
import { CustomerStore } from '../../core/customer.store';
import { Images } from '../../core/images.service';
import { Native } from '../../core/native.service';
import { MarkComponent } from '../../ui/mark.component';
import { JodPipe } from '../../ui/price.pipe';
import { ProductCardComponent } from '../../ui/product-card.component';
import { ProductSheet } from '../../ui/product-sheet.service';
import { StepperComponent } from '../../ui/stepper.component';

@Component({
  selector: 'app-cart',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonFooter, IonIcon, RouterLink, JodPipe, StepperComponent, MarkComponent, ProductCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart.page.html',
  styleUrl: './cart.page.scss',
})
export class CartPage {
  cart = inject(CartStore);
  catalog = inject(Catalog);
  private customer = inject(CustomerStore);
  private images = inject(Images);
  private sheet = inject(ProductSheet);
  private alerts = inject(AlertController);
  private router = inject(Router);
  private native = inject(Native);

  now = new Date();
  settings = this.catalog.settings;
  canCheckout = computed(() => this.cart.count() > 0 && this.cart.minLeft() <= 0 && this.settings().store_open);
  suggestions = computed(() => {
    const inCart = new Set(Object.keys(this.cart.qty()));
    return this.catalog.top().filter(p => !inCart.has(p.id)).slice(0, 10);
  });

  constructor() { addIcons({ bicycleOutline, chevronBack, sparklesOutline, trashOutline }); }
  ionViewWillEnter() { this.now = new Date(); }

  img(p: Product) { return this.images.url(p); }
  open(p: Product) { this.sheet.open(p); }

  async clear() {
    const a = await this.alerts.create({
      header: 'إفراغ السلة؟', message: 'ستُحذف كل الأصناف من سلتك.',
      buttons: [{ text: 'تراجع', role: 'cancel' }, { text: 'إفراغ', role: 'destructive', handler: () => { this.cart.clear(); this.native.warn(); } }],
    });
    await a.present();
  }

  checkout() {
    if (!this.canCheckout()) { this.native.warn(); return; }
    this.native.thud();
    if (!this.customer.signedIn()) this.router.navigateByUrl('/welcome?next=/checkout');
    else if (!this.customer.hasAddress()) this.router.navigateByUrl('/address?next=/checkout');
    else this.router.navigateByUrl('/checkout');
  }
}
