import { Injectable, inject, signal } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { Product } from '../core/catalog.store';

/** Opens the product as a bottom sheet. If one is already open, it swaps the product in place. */
@Injectable({ providedIn: 'root' })
export class ProductSheet {
  private modals = inject(ModalController);
  readonly current = signal<Product | null>(null);
  private open$: HTMLIonModalElement | null = null;
  private opening = false;

  async open(p: Product) {
    if (this.open$ || this.opening) { this.current.set(p); return; }
    this.opening = true;
    this.current.set(p);
    const { ProductSheetComponent } = await import('./product-sheet.component');
    const m = await this.modals.create({
      component: ProductSheetComponent,
      breakpoints: [0, 0.92],
      initialBreakpoint: 0.92,
      handle: true,
      cssClass: 'sheet',
      canDismiss: true,
    });
    this.open$ = m; this.opening = false;
    m.onDidDismiss().then(() => { this.open$ = null; this.current.set(null); });
    await m.present();
  }
  close() { this.open$?.dismiss(); }
}
