import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add } from 'ionicons/icons';
import { CartStore } from '../core/cart.store';
import { Product } from '../core/catalog.store';
import { Images } from '../core/images.service';
import { Ui } from '../core/ui.service';
import { ProductSheet } from './product-sheet.service';
import { JodPipe } from './price.pipe';
import { StepperComponent } from './stepper.component';

@Component({
  selector: 'app-product-card',
  imports: [IonIcon, StepperComponent, JodPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.row]': 'layout() === "row"' },
  template: `
    <article class="card press" (click)="open()" role="button" [attr.aria-label]="p().name">
      <div class="shot" #shot>
        @if (src() && !broken()) {
          <img [src]="src()" [alt]="p().name" loading="lazy" decoding="async" (load)="loaded.set(true)" (error)="broken.set(true)" [class.in]="loaded()" />
        } @else {
          <span class="emoji" aria-hidden="true">{{ p().emoji }}</span>
        }
        @if (q() === 0) {
          <button type="button" class="add" (click)="$event.stopPropagation(); addOne()" [attr.aria-label]="'أضف ' + p().name">
            <ion-icon name="add" />
          </button>
        }
      </div>
      <div class="info">
        <h3 class="name">{{ p().name }}</h3>
        <div class="foot">
          <span class="price">{{ p().price | jod }}<span class="cur">د.أ</span></span>
          @if (q() > 0) {
            <app-stepper [qty]="q()" [atMax]="q() >= p().stock" (inc)="addOne()" (dec)="cart.add(p(), -1)" />
          }
        </div>
      </div>
    </article>`,
  styles: [`
    :host { display: block; min-width: 0; }
    .card { display: flex; flex-direction: column; gap: 10px; cursor: pointer; }
    .shot { position: relative; aspect-ratio: 1; border-radius: var(--r-card); background: var(--aisle); overflow: hidden; display: grid; place-items: center; }
    .shot img { width: 78%; height: 78%; object-fit: contain; mix-blend-mode: multiply; opacity: 0; transform: scale(.94); transition: opacity .35s ease, transform .5s var(--ease-out); }
    .shot img.in { opacity: 1; transform: none; }
    .emoji { font-size: 46px; filter: saturate(.9); }
    .add { position: absolute; bottom: 8px; inset-inline-start: 8px; width: 38px; height: 38px; border-radius: 50%; border: 0; background: #fff; color: var(--navy);
      display: grid; place-items: center; font-size: 22px; box-shadow: 0 6px 16px rgba(10,31,92,.16); cursor: pointer; transition: transform .2s var(--ease-spring); }
    .add:active { transform: scale(.86); }
    .info { display: flex; flex-direction: column; gap: 6px; padding: 0 2px; min-width: 0; }
    .name { margin: 0; font-size: 13.5px; font-weight: 500; line-height: 1.45; color: var(--fg); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.9em; }
    .foot { display: flex; align-items: center; justify-content: space-between; gap: 6px; min-height: 38px; }
    .price { font-size: 15px; color: var(--navy); }
    :host(.row) .card { flex-direction: row; align-items: center; gap: 14px; }
    :host(.row) .shot { width: 86px; flex: none; border-radius: var(--r-tile); }
    :host(.row) .add { width: 32px; height: 32px; font-size: 18px; bottom: 4px; inset-inline-start: 4px; }
    :host(.row) .info { flex: 1; }
    :host(.row) .name { min-height: 0; }
  `],
})
export class ProductCardComponent {
  p = input.required<Product>();
  layout = input<'grid' | 'row'>('grid');
  cart = inject(CartStore);
  private images = inject(Images);
  private ui = inject(Ui);
  private sheet = inject(ProductSheet);
  private shot = viewChild<ElementRef<HTMLElement>>('shot');
  loaded = signal(false);
  broken = signal(false);
  src = computed(() => this.images.url(this.p()));
  q = computed(() => this.cart.of(this.p().id));
  constructor() { addIcons({ add }); }

  addOne() {
    const before = this.q();
    this.cart.add(this.p());
    if (before === 0) this.ui.fly(this.shot()?.nativeElement ?? null, this.broken() ? null : this.src());
  }
  open() { this.sheet.open(this.p()); }
}
