import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';
import { Catalog } from '../../core/catalog.store';

@Component({
  selector: 'app-aisles',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <ion-header [translucent]="true"><ion-toolbar><ion-title>الأقسام</ion-title></ion-toolbar></ion-header>
  <ion-content [fullscreen]="true">
    <ion-header collapse="condense"><ion-toolbar><ion-title size="large">الأقسام</ion-title></ion-toolbar></ion-header>
    <div class="wrap">
      <button class="search press" type="button" routerLink="/search"><ion-icon name="search-outline" /> ابحث في كل الأقسام</button>
      <div class="list">
        @for (a of aisles(); track a.id; let i = $index) {
          <a class="row press" [routerLink]="['/tabs/aisles', a.id]" [style.animation-delay.ms]="i * 35">
            <div class="txt">
              <b>{{ a.name }}</b>
              <span>{{ a.count }} منتج@if (a.subs.length) { — {{ a.subs.slice(0, 3).join('، ') }}}</span>
            </div>
            <div class="pic">@if (a.img) { <img [src]="a.img" alt="" loading="lazy" /> } @else { <em>{{ a.emoji }}</em> }</div>
          </a>
        }
      </div>
    </div>
  </ion-content>`,
  styles: [`
    .wrap { padding: 4px 20px calc(30px + env(safe-area-inset-bottom)); }
    .search { width: 100%; height: 48px; border-radius: 999px; border: 0; background: var(--aisle); color: var(--muted); display: flex; align-items: center; gap: 10px; padding: 0 16px; font-size: 14.5px; cursor: pointer; margin-bottom: 18px; ion-icon { color: var(--navy); font-size: 19px; } }
    .list { display: flex; flex-direction: column; gap: 12px; }
    .row { display: flex; align-items: center; gap: 14px; min-height: 104px; padding: 0 0 0 0; border-radius: var(--r-card); background: var(--aisle); overflow: hidden; text-decoration: none; color: var(--fg);
      animation: in .5s cubic-bezier(.16,1,.3,1) both; }
    @keyframes in { from { opacity: 0; transform: translateY(14px); } }
    .txt { flex: 1; padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; min-width: 0; b { font-size: 17px; font-weight: 700; } span { font-size: 12.5px; color: var(--fg-2); line-height: 1.5; } }
    .pic { width: 118px; align-self: stretch; display: grid; place-items: center; background: radial-gradient(circle at 50% 55%, #fff 0%, rgba(255,255,255,0) 68%);
      img { width: 84px; height: 84px; object-fit: contain; mix-blend-mode: multiply; transform: rotate(-6deg); } em { font-style: normal; font-size: 44px; } }
  `],
})
export class AislesPage {
  private catalog = inject(Catalog);
  aisles = computed(() => this.catalog.aisles().map(a => ({
    ...a, img: this.catalog.aisleImage(a.id), count: this.catalog.aisleCount(a.id), subs: this.catalog.subs(a.id).map(s => s.name),
  })));
  constructor() { addIcons({ searchOutline }); }
}
