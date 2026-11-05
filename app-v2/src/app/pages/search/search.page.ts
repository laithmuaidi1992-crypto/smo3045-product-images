import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonIcon, IonToolbar, NavController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeCircle, searchOutline, timeOutline, trendingUpOutline } from 'ionicons/icons';
import { Catalog } from '../../core/catalog.store';
import { store } from '../../core/store';
import { CartBarComponent } from '../../ui/cart-bar.component';
import { ProductCardComponent } from '../../ui/product-card.component';

const SUGGEST = ['حليب', 'خبز', 'بيض', 'أرز', 'زيت', 'سكر', 'شاي', 'قهوة', 'جبنة', 'مياه', 'شيبس', 'شامبو', 'معجون أسنان', 'حفاضات'];

@Component({
  selector: 'app-search',
  imports: [IonContent, IonHeader, IonToolbar, IonIcon, RouterLink, ProductCardComponent, CartBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <ion-header>
    <ion-toolbar>
      <div class="top">
        <label class="field">
          <ion-icon name="search-outline" />
          <input #box type="search" [value]="q()" (input)="type($any($event.target).value)" (keydown.enter)="remember(); box.blur()"
                 placeholder="ابحث عن منتج، ماركة أو قسم" enterkeyhint="search" autocomplete="off" />
          @if (q()) { <button type="button" (click)="type(''); box.focus()" aria-label="مسح"><ion-icon name="close-circle" /></button> }
        </label>
        <button class="cancel" type="button" (click)="nav.back()">إلغاء</button>
      </div>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    @if (!q()) {
      <div class="pad">
        @if (recent().length) {
          <div class="h"><h2 class="h-sec">بحثت مؤخرًا</h2><button type="button" (click)="clearRecent()">مسح</button></div>
          <div class="chips">
            @for (r of recent(); track r) { <button class="chip" (click)="type(r)"><ion-icon name="time-outline" /> {{ r }}</button> }
          </div>
        }
        <div class="h"><h2 class="h-sec">الأكثر بحثًا</h2></div>
        <div class="chips">
          @for (s of suggest; track s) { <button class="chip" (click)="type(s)"><ion-icon name="trending-up-outline" /> {{ s }}</button> }
        </div>
        <div class="h"><h2 class="h-sec">تصفّح الأقسام</h2></div>
        <div class="aisles">
          @for (a of catalog.aisles(); track a.id) {
            <a class="aisle" [routerLink]="['/tabs/aisles', a.id]">{{ a.emoji }} {{ a.name }}</a>
          }
        </div>
      </div>
    } @else {
      <div class="meta">
        @if (results().length) { <span><b>{{ results().length >= 120 ? '+120' : results().length }}</b> نتيجة لـ «{{ q() }}»</span> }
      </div>
      @if (aisleHits().length) {
        <div class="chips pad0">
          @for (a of aisleHits(); track a.id) { <a class="chip on" [routerLink]="['/tabs/aisles', a.parent || a.id]" (click)="remember()">{{ a.name }}</a> }
        </div>
      }
      @if (results().length) {
        <div class="grid" (click)="remember()">
          @for (p of results(); track p.id) { <app-product-card [p]="p" /> }
        </div>
      } @else {
        <div class="none">
          <div class="art" aria-hidden="true">🔍</div>
          <b>لم نجد «{{ q() }}» على الرفوف</b>
          <span>جرّب اسمًا أقصر أو كلمة أخرى، مثل:</span>
          <div class="chips">@for (s of suggest.slice(0, 6); track s) { <button class="chip" (click)="type(s)">{{ s }}</button> }</div>
        </div>
      }
    }
    <div style="height: 110px"></div>
    <app-cart-bar />
  </ion-content>`,
  styles: [`
    .top { display: flex; align-items: center; gap: 10px; padding: 6px 14px 8px; }
    .field { flex: 1; height: 46px; border-radius: 999px; background: var(--aisle); display: flex; align-items: center; gap: 8px; padding: 0 14px; color: var(--navy);
      input { flex: 1; border: 0; outline: 0; background: none; color: var(--fg); min-width: 0; height: 100%; }
      input::-webkit-search-cancel-button { display: none; }
      button { border: 0; background: none; color: var(--muted); font-size: 19px; display: grid; place-items: center; padding: 0; } }
    .cancel { border: 0; background: none; color: var(--navy); font-weight: 600; font-size: 15px; padding: 6px 2px; cursor: pointer; }
    .pad { padding: 8px 20px; }
    .h { display: flex; align-items: center; justify-content: space-between; margin: 18px 0 10px; button { border: 0; background: none; color: var(--fg-2); font-size: 13px; } }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; ion-icon { color: var(--muted); } }
    .chips.pad0 { padding: 0 20px 10px; flex-wrap: nowrap; overflow-x: auto; }
    .chip.on { text-decoration: none; }
    .aisles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .aisle { padding: 14px; border-radius: var(--r-tile); background: var(--aisle); color: var(--fg); text-decoration: none; font-weight: 600; font-size: 14px; }
    .meta { padding: 14px 20px 10px; color: var(--fg-2); font-size: 13.5px; b { color: var(--fg); } }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px 14px; padding: 4px 20px; }
    .none { padding: 50px 26px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center;
      .art { font-size: 44px; } b { font-size: 17px; } span { color: var(--fg-2); font-size: 14px; } .chips { justify-content: center; margin-top: 8px; } }
  `],
})
export class SearchPage {
  catalog = inject(Catalog);
  nav = inject(NavController);
  private box = viewChild<ElementRef<HTMLInputElement>>('box');
  suggest = SUGGEST;
  q = signal('');
  private dq = signal('');
  private timer: any;
  recent = signal<string[]>(store.get('v2_recent', []));
  results = computed(() => this.catalog.search(this.dq()));
  aisleHits = computed(() => {
    const t = this.dq().trim(); if (t.length < 2) return [];
    return this.catalog.cats().filter(c => c.name.includes(t)).slice(0, 5);
  });

  constructor() { addIcons({ closeCircle, searchOutline, timeOutline, trendingUpOutline }); }
  ionViewDidEnter() { setTimeout(() => this.box()?.nativeElement.focus(), 80); }
  type(v: string) {
    this.q.set(v);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.dq.set(v), 110);
  }
  remember() {
    const v = this.q().trim(); if (v.length < 2) return;
    const r = [v, ...this.recent().filter(x => x !== v)].slice(0, 8);
    this.recent.set(r); store.set('v2_recent', r);
  }
  clearRecent() { this.recent.set([]); store.del('v2_recent'); }
}
