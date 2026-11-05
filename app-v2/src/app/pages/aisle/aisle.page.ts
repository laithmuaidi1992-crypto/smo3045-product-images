import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeCircle, gridOutline, listOutline, searchOutline, swapVerticalOutline } from 'ionicons/icons';
import { norm } from '../../core/arabic';
import { Catalog, Product } from '../../core/catalog.store';
import { Native } from '../../core/native.service';
import { store } from '../../core/store';
import { ProductCardComponent } from '../../ui/product-card.component';

type Sort = 'popular' | 'cheap' | 'pricey' | 'az';
const SORTS: { k: Sort; l: string }[] = [{ k: 'popular', l: 'الأنسب' }, { k: 'cheap', l: 'الأرخص' }, { k: 'pricey', l: 'الأغلى' }, { k: 'az', l: 'أ — ي' }];

@Component({
  selector: 'app-aisle',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, ProductCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <ion-header [translucent]="true">
    <ion-toolbar>
      <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/aisles" /></ion-buttons>
      <ion-title>{{ aisle()?.name || 'القسم' }}</ion-title>
      <ion-buttons slot="end">
        <button class="ic" type="button" (click)="toggleView()" [attr.aria-label]="view() === 'grid' ? 'عرض كقائمة' : 'عرض كشبكة'">
          <ion-icon [name]="view() === 'grid' ? 'list-outline' : 'grid-outline'" />
        </button>
      </ion-buttons>
    </ion-toolbar>
    <ion-toolbar class="tools">
      <div class="find">
        <ion-icon name="search-outline" />
        <input type="search" [value]="q()" (input)="q.set($any($event.target).value)" [placeholder]="'ابحث في ' + (aisle()?.name || 'القسم')" enterkeyhint="search" />
        @if (q()) { <button type="button" (click)="q.set('')" aria-label="مسح"><ion-icon name="close-circle" /></button> }
      </div>
      <div class="chips">
        <button class="chip" [class.on]="sub() === null" (click)="pickSub(null)">الكل · {{ total() }}</button>
        @for (s of subs(); track s.id) {
          <button class="chip" [class.on]="sub() === s.id" (click)="pickSub(s.id)">{{ s.name }}</button>
        }
      </div>
    </ion-toolbar>
  </ion-header>

  <ion-content [fullscreen]="true">
    <div class="bar">
      <span class="count">{{ list().length }} منتج</span>
      <div class="sorts">
        <ion-icon name="swap-vertical-outline" />
        @for (s of sorts; track s.k) {
          <button type="button" [class.on]="sort() === s.k" (click)="setSort(s.k)">{{ s.l }}</button>
        }
      </div>
    </div>
    @if (!list().length) {
      <div class="empty"><b>لا يوجد ما يطابق «{{ q() }}» هنا</b><span>جرّب كلمة أخرى أو ابحث في كل المتجر.</span></div>
    }
    <div [class]="view() === 'grid' ? 'grid' : 'rows'">
      @for (p of shown(); track p.id) { <app-product-card [p]="p" [layout]="view() === 'grid' ? 'grid' : 'row'" /> }
    </div>
    <ion-infinite-scroll (ionInfinite)="more($event)" [disabled]="shown().length >= list().length">
      <ion-infinite-scroll-content />
    </ion-infinite-scroll>
  </ion-content>`,
  styles: [`
    .ic { width: 40px; height: 40px; border: 0; background: none; color: var(--navy); font-size: 22px; display: grid; place-items: center; cursor: pointer; }
    ion-toolbar.tools { --padding-top: 0; --padding-bottom: 8px; --min-height: 0; }
    .find { margin: 2px 16px 10px; height: 44px; border-radius: 999px; background: var(--aisle); display: flex; align-items: center; gap: 8px; padding: 0 14px; color: var(--muted);
      input { flex: 1; border: 0; background: none; outline: none; color: var(--fg); min-width: 0; height: 100%; } button { border: 0; background: none; color: var(--muted); font-size: 18px; display: grid; place-items: center; padding: 0; } }
    .chips { display: flex; gap: 8px; overflow-x: auto; padding: 0 16px; scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
    .bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 20px 6px; }
    .count { font-size: 13px; color: var(--fg-2); white-space: nowrap; }
    .sorts { display: flex; align-items: center; gap: 4px; overflow-x: auto; scrollbar-width: none; ion-icon { color: var(--muted); flex: none; }
      button { border: 0; background: none; padding: 6px 8px; border-radius: 999px; font-size: 12.5px; color: var(--fg-2); white-space: nowrap; cursor: pointer; }
      button.on { color: var(--navy); font-weight: 700; background: var(--aisle); } }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px 14px; padding: 10px 20px 30px; }
    .rows { display: flex; flex-direction: column; gap: 14px; padding: 10px 20px 30px; }
    .empty { padding: 50px 30px; text-align: center; display: flex; flex-direction: column; gap: 6px; span { color: var(--fg-2); font-size: 14px; } }
  `],
})
export class AislePage {
  id = input.required<string>();
  private catalog = inject(Catalog);
  private native = inject(Native);
  sorts = SORTS;
  q = signal('');
  sub = signal<number | null>(null);
  sort = signal<Sort>('popular');
  view = signal<'grid' | 'row'>(store.get('v2_view', 'grid'));
  limit = signal(40);

  aisle = computed(() => this.catalog.cat(Number(this.id())));
  subs = computed(() => this.catalog.subs(Number(this.id())));
  total = computed(() => this.catalog.aisleCount(Number(this.id())));
  list = computed<Product[]>(() => {
    let l = this.catalog.productsIn(Number(this.id()), this.sub());
    const nq = norm(this.q());
    if (nq) { const toks = nq.split(' '); l = l.filter(p => toks.every(t => p.n.includes(t))); }
    const top = new Set(this.catalog.topIds());
    switch (this.sort()) {
      case 'cheap': return [...l].sort((a, b) => a.price - b.price);
      case 'pricey': return [...l].sort((a, b) => b.price - a.price);
      case 'az': return l;
      default: return [...l].sort((a, b) => (top.has(b.id) ? 1 : 0) - (top.has(a.id) ? 1 : 0) || b.stock - a.stock);
    }
  });
  shown = computed(() => this.list().slice(0, this.limit()));

  constructor() { addIcons({ closeCircle, gridOutline, listOutline, searchOutline, swapVerticalOutline }); }
  pickSub(id: number | null) { this.native.selection(); this.sub.set(id); this.limit.set(40); }
  setSort(s: Sort) { this.native.selection(); this.sort.set(s); this.limit.set(40); }
  toggleView() { const v = this.view() === 'grid' ? 'row' : 'grid'; this.view.set(v); store.set('v2_view', v); this.native.selection(); }
  more(ev: CustomEvent) { this.limit.update(n => n + 40); setTimeout(() => (ev.target as HTMLIonInfiniteScrollElement).complete(), 60); }
}
