import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Catalog } from '../../core/catalog.store';
import { Native } from '../../core/native.service';
import { Order, OrdersStore } from '../../core/orders.store';
import { MarkComponent } from '../../ui/mark.component';
import { JodPipe } from '../../ui/price.pipe';

/** The receipt prints out of the slot: the one celebratory moment of the order flow. */
@Component({
  selector: 'app-placed',
  imports: [IonContent, MarkComponent, JodPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <ion-content [fullscreen]="true" class="placed">
    <div class="stage">
      <div class="top">
        <app-mark [width]="96" [draw]="true" [light]="true" />
        <h1>وصلنا طلبك</h1>
        <p>نبدأ بتجهيزه حالًا. الوقت المتوقع {{ catalog.settings().eta }}.</p>
      </div>
      <div class="printer">
        <div class="slot"></div>
        <div class="paper">
          <div class="rc">
            <div class="rh"><b dir="ltr">3045 Market</b><span>إربد · مفتوح 24 ساعة</span></div>
            <div class="no"><span>رقم الطلب</span><b dir="ltr">{{ no() }}</b></div>
            @if (order(); as o) {
              <ul>
                @for (i of o.items.slice(0, 6); track i.id) { <li><span>{{ i.qty }} × {{ i.name }}</span><span>{{ i.line | jod }}</span></li> }
                @if (o.items.length > 6) { <li class="more">و{{ o.items.length - 6 }} أصناف أخرى</li> }
              </ul>
              <div class="tot"><span>الإجمالي عند الاستلام</span><b>{{ o.total | jod }} د.أ</b></div>
            } @else {
              <div class="sk"><i class="skeleton"></i><i class="skeleton"></i><i class="skeleton"></i></div>
            }
            <div class="bar" aria-hidden="true">@for (b of bars; track $index) { <i [style.width.px]="b"></i> }</div>
            <p class="thanks">شكرًا لأنك تتسوّق من حيّك</p>
          </div>
          <div class="tear"></div>
        </div>
      </div>
    </div>
  </ion-content>
  <div class="cta">
    <button class="btn red block" type="button" (click)="track()">تابع طلبك لحظة بلحظة</button>
    <button class="btn ghost block" type="button" (click)="home()">العودة للتسوّق</button>
  </div>`,
  styles: [`
    .placed { --background: var(--navy); }
    .stage { min-height: 100%; padding: calc(env(safe-area-inset-top) + 34px) 22px 200px; display: flex; flex-direction: column; align-items: center; color: #fff; }
    .top { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; animation: rise .6s var(--ease-out) both; }
    h1 { margin: 10px 0 0; font-size: 30px; font-weight: 700; letter-spacing: -.01em; }
    .top p { margin: 0; color: rgba(255,255,255,.72); font-size: 15px; }
    @keyframes rise { from { opacity: 0; transform: translateY(14px); } }
    .printer { margin-top: 30px; width: 100%; max-width: 360px; position: relative; }
    .slot { height: 14px; border-radius: 999px; background: #061543; box-shadow: inset 0 3px 6px rgba(0,0,0,.6); position: relative; z-index: 2; }
    .paper { margin: -7px 14px 0; overflow: hidden; position: relative; z-index: 1; }
    .rc { background: var(--paper); color: var(--fg); padding: 22px 20px 14px; transform: translateY(-100%); animation: print 1.9s .5s steps(14, end) forwards, settle .4s 2.4s ease-out forwards; font-variant-numeric: tabular-nums; }
    @keyframes print { to { transform: translateY(0); } }
    @keyframes settle { from { transform: translateY(0); } 50% { transform: translateY(4px); } to { transform: translateY(0); } }
    .tear { height: 12px; background: linear-gradient(-45deg, transparent 6px, var(--paper) 0) 0 0 / 12px 12px, linear-gradient(45deg, transparent 6px, var(--paper) 0) 0 0 / 12px 12px; transform: translateY(-100%); animation: print 1.9s .5s steps(14, end) forwards; }
    .rh { text-align: center; display: flex; flex-direction: column; gap: 2px; padding-bottom: 12px; border-bottom: 2px dashed #D9D6CB; b { font-size: 17px; color: var(--navy); } span { font-size: 12px; color: var(--fg-2); } }
    .no { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; font-size: 13px; color: var(--fg-2); b { font-size: 16px; color: var(--fg); letter-spacing: .04em; } }
    ul { list-style: none; margin: 0; padding: 0 0 10px; display: flex; flex-direction: column; gap: 6px; font-size: 13px; border-bottom: 2px dashed #D9D6CB;
      li { display: flex; justify-content: space-between; gap: 10px; span:first-child { color: var(--fg-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } } .more { color: var(--muted); } }
    .tot { display: flex; justify-content: space-between; align-items: baseline; padding: 12px 0 6px; span { font-weight: 600; } b { font-size: 20px; color: var(--navy); } }
    .sk { display: flex; flex-direction: column; gap: 8px; padding-bottom: 10px; i { height: 12px; border-radius: 6px; } }
    .bar { display: flex; gap: 2px; justify-content: center; height: 34px; margin: 12px 0 6px; i { background: var(--fg); height: 100%; } }
    .thanks { margin: 0; text-align: center; font-size: 12px; color: var(--fg-2); }
    .cta { position: fixed; inset-inline: 0; bottom: 0; padding: 14px 20px calc(16px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 8px; background: linear-gradient(transparent, var(--navy) 30%); z-index: 10; animation: rise .5s 2.2s var(--ease-out) both; }
    .cta .ghost { color: #fff; background: rgba(255,255,255,.1); }
    @media (prefers-reduced-motion: reduce) { .rc, .tear { animation: none; transform: none; } .cta, .top { animation: none; } }
  `],
})
export class PlacedPage {
  no = input.required<string>();
  catalog = inject(Catalog);
  private orders = inject(OrdersStore);
  private router = inject(Router);
  private native = inject(Native);
  order = signal<Order | null>(null);
  bars = Array.from({ length: 38 }, (_, i) => [1, 2, 3, 1, 2][(i * 7) % 5]);

  ionViewWillLeave() { this.native.statusBar(false); }
  async ionViewWillEnter() {
    this.native.statusBar(true);
    setTimeout(() => this.native.thud(), 2300);
    try { this.order.set(await this.orders.get(this.no())); } catch { /* the receipt still shows the number */ }
  }
  track() { this.router.navigate(['/order', this.no()], { replaceUrl: true }); }
  home() { this.router.navigateByUrl('/tabs/home', { replaceUrl: true }); }
}
