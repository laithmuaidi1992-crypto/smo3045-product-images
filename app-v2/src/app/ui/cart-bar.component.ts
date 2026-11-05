import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { bag, chevronBack } from 'ionicons/icons';
import { CartStore } from '../core/cart.store';
import { Ui } from '../core/ui.service';
import { JodPipe } from './price.pipe';

/** Floating stadium that follows you through the shelves once something is in the cart. */
@Component({
  selector: 'app-cart-bar',
  imports: [RouterLink, IonIcon, JodPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.tabs]': 'aboveTabs()' },
  template: `
    @if (cart.count() > 0) {
      <a class="bar press" routerLink="/tabs/cart" #bar>
        <span class="n" data-cart-target>{{ cart.count() }}</span>
        <span class="t">عرض السلة</span>
        <span class="price">{{ cart.total() | jod }}<span class="cur">د.أ</span></span>
        <ion-icon name="chevron-back" />
      </a>
    }`,
  styles: [`
    :host { position: fixed; inset-inline: 16px; bottom: calc(16px + env(safe-area-inset-bottom)); z-index: 20; pointer-events: none; }
    :host(.tabs) { bottom: 12px; }
    .bar { pointer-events: auto; height: 58px; border-radius: 999px; background: var(--navy); color: #fff; display: flex; align-items: center; gap: 12px; padding: 0 10px 0 18px;
      text-decoration: none; box-shadow: var(--shadow-float); animation: up .45s cubic-bezier(.16,1,.3,1); position: relative; overflow: hidden; }
    .bar::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 3px; background: var(--red); }
    .n { min-width: 34px; height: 34px; border-radius: 999px; background: #fff; color: var(--navy); font-weight: 700; display: grid; place-items: center; padding: 0 8px; font-variant-numeric: tabular-nums; }
    .t { flex: 1; font-weight: 600; font-size: 15.5px; }
    .price { font-size: 16px; } .price .cur { color: rgba(255,255,255,.7); }
    ion-icon { font-size: 18px; opacity: .8; }
    @keyframes up { from { transform: translateY(120%); opacity: 0; } }
  `],
})
export class CartBarComponent {
  cart = inject(CartStore);
  private ui = inject(Ui);
  aboveTabs = input(false);
  private bar = viewChild<ElementRef<HTMLElement>>('bar');
  constructor() {
    addIcons({ bag, chevronBack });
    effect(() => { if (this.cart.pulse()) this.ui.bump(this.bar()?.nativeElement ?? null); });
  }
}
