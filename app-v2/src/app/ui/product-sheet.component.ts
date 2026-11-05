import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, bagCheckOutline, chevronBack, closeOutline } from 'ionicons/icons';
import { CartStore } from '../core/cart.store';
import { Catalog, Product } from '../core/catalog.store';
import { Images } from '../core/images.service';
import { Ui } from '../core/ui.service';
import { JodPipe } from './price.pipe';
import { ProductCardComponent } from './product-card.component';
import { ProductSheet } from './product-sheet.service';
import { StepperComponent } from './stepper.component';

@Component({
  selector: 'app-product-sheet',
  imports: [IonContent, IonIcon, JodPipe, StepperComponent, ProductCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @if (p(); as p) {
    <ion-content [scrollY]="true" #content>
      <div class="wrap">
        <button class="x" type="button" (click)="sheet.close()" aria-label="إغلاق"><ion-icon name="close-outline" /></button>
        <div class="stage" #stage>
          <div class="halo"></div>
          @if (src() && !broken()) {
            <img [src]="src()" [alt]="p.name" (error)="broken.set(true)" />
          } @else {
            <span class="emoji">{{ p.emoji }}</span>
          }
        </div>

        <div class="body">
          @if (aisle(); as a) {
            <button class="crumb" type="button" (click)="goAisle(a.id)">{{ a.name }} <ion-icon name="chevron-back" /></button>
          }
          <h1 class="name">{{ p.name }}</h1>
          <div class="priceRow">
            <span class="price big">{{ p.price | jod }}<span class="cur">د.أ</span></span>
            @if (p.stock <= 3) { <span class="low">بقي {{ p.stock }} فقط</span> }
          </div>

          <div class="buy">
            @if (q() > 0) {
              <app-stepper [big]="true" [qty]="q()" [atMax]="q() >= p.stock" (inc)="cart.add(p)" (dec)="cart.add(p, -1)" />
              <button class="btn ghost" type="button" (click)="goCart()"><ion-icon name="bag-check-outline" /> السلة · {{ cart.total() | jod }} د.أ</button>
            } @else {
              <button class="btn primary block" type="button" (click)="addFirst()">
                <ion-icon name="add" /> أضف للسلة <span class="sep"></span> {{ p.price | jod }} د.أ
              </button>
            }
          </div>
        </div>

        @if (related().length) {
          <section class="rel">
            <h2 class="h-sec">من نفس الرف</h2>
            <div class="rail">
              @for (r of related(); track r.id) { <app-product-card [p]="r" /> }
            </div>
          </section>
        }
      </div>
    </ion-content>
  }`,
  styles: [`
    .wrap { padding: 26px 0 calc(28px + env(safe-area-inset-bottom)); position: relative; }
    .x { position: absolute; top: 18px; inset-inline-end: 16px; z-index: 2; width: 38px; height: 38px; border-radius: 50%; border: 0; background: var(--aisle); color: var(--fg); font-size: 22px; display: grid; place-items: center; cursor: pointer; }
    .stage { position: relative; margin: 6px 20px 0; height: 300px; border-radius: 28px; background: var(--aisle); display: grid; place-items: center; overflow: hidden; }
    .halo { position: absolute; width: 260px; height: 260px; border-radius: 50%; background: radial-gradient(circle, #fff 0%, rgba(255,255,255,0) 70%); }
    .stage img { position: relative; max-width: 74%; max-height: 82%; object-fit: contain; mix-blend-mode: multiply; animation: in .55s cubic-bezier(.16,1,.3,1); }
    .emoji { position: relative; font-size: 110px; }
    @keyframes in { from { opacity: 0; transform: translateY(16px) scale(.92); } }
    .body { padding: 18px 20px 4px; display: flex; flex-direction: column; gap: 10px; }
    .crumb { align-self: flex-start; border: 0; background: none; color: var(--fg-2); font-size: 13px; display: inline-flex; align-items: center; gap: 2px; padding: 0; cursor: pointer; }
    .name { margin: 0; font-size: 22px; font-weight: 700; line-height: 1.35; letter-spacing: -.01em; }
    .priceRow { display: flex; align-items: center; gap: 12px; }
    .price.big { font-size: 26px; color: var(--navy); }
    .low { font-size: 12px; font-weight: 600; color: var(--red); background: var(--red-tint); padding: 4px 10px; border-radius: 999px; }
    .buy { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
    .buy .btn.ghost { flex: 1; height: 54px; font-size: 14px; }
    .sep { width: 1px; height: 18px; background: rgba(255,255,255,.3); }
    .rel { margin-top: 26px; }
    .rel h2 { padding: 0 20px 12px; }
    .rail { display: grid; grid-auto-flow: column; grid-auto-columns: 136px; gap: 14px; overflow-x: auto; padding: 0 20px 6px; scroll-snap-type: x mandatory; scrollbar-width: none; }
    .rail::-webkit-scrollbar { display: none; }
    .rail > * { scroll-snap-align: start; }
  `],
})
export class ProductSheetComponent {
  sheet = inject(ProductSheet);
  cart = inject(CartStore);
  private catalog = inject(Catalog);
  private images = inject(Images);
  private ui = inject(Ui);
  private router = inject(Router);
  private stage = viewChild<ElementRef<HTMLElement>>('stage');
  private content = viewChild<IonContent>('content');

  p = this.sheet.current;
  broken = signal(false);
  src = computed(() => this.images.url(this.p()));
  q = computed(() => { const p = this.p(); return p ? this.cart.of(p.id) : 0; });
  aisle = computed(() => {
    const p = this.p(); if (!p) return null;
    const c = this.catalog.cat(p.cat); if (!c) return null;
    return c.parent ? this.catalog.cat(c.parent) ?? c : c;
  });
  related = computed(() => {
    const p = this.p(); if (!p) return [];
    return this.catalog.productsIn(p.cat).filter(x => x.id !== p.id).slice(0, 12);
  });

  constructor() {
    addIcons({ add, bagCheckOutline, chevronBack, closeOutline });
    // swapping to a related product: reset the photo state and scroll back up
    effect(() => { this.p(); this.broken.set(false); this.content()?.scrollToTop(250); });
  }

  addFirst() {
    const p = this.p(); if (!p) return;
    this.cart.add(p);
    this.ui.fly(this.stage()?.nativeElement ?? null, this.broken() ? null : this.src());
  }
  goCart() { this.sheet.close(); this.router.navigateByUrl('/tabs/cart'); }
  goAisle(id: number) { this.sheet.close(); this.router.navigate(['/tabs/aisles', id]); }
}
