import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonToolbar } from '@ionic/angular/standalone';
import { CustomerStore, normPhone } from '../../core/customer.store';
import { PRIVACY_URL } from '../../core/env';
import { Native } from '../../core/native.service';
import { MarkComponent } from '../../ui/mark.component';

@Component({
  selector: 'app-welcome',
  imports: [IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, FormsModule, MarkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <ion-header class="ion-no-border"><ion-toolbar><ion-buttons slot="start"><ion-back-button defaultHref="/tabs/home" /></ion-buttons></ion-toolbar></ion-header>
  <ion-content>
    <form class="wrap" (ngSubmit)="go()">
      <app-mark [width]="120" />
      <h1 class="h-title">لنتعرّف عليك</h1>
      <p class="lead">نحتاج اسمك ورقمك فقط ليصلك الطلب ويتصل بك المندوب عند الباب. لا كلمات سر.</p>

      <div class="field">
        <label for="ph">رقم الموبايل</label>
        <div class="phone" [class.bad]="tried() && !phoneOk()">
          <span class="cc">+962</span>
          <input id="ph" name="ph" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="79 123 4567"
                 [ngModel]="phone()" (ngModelChange)="phone.set($event)" maxlength="16" dir="ltr" />
        </div>
        @if (tried() && !phoneOk()) { <span class="err">اكتب رقمًا أردنيًا صحيحًا يبدأ بـ 77 أو 78 أو 79</span> }
      </div>

      <div class="field">
        <label for="nm">الاسم</label>
        <input id="nm" name="nm" autocomplete="name" placeholder="مثال: ليث" [ngModel]="name()" (ngModelChange)="name.set($event)" maxlength="60" />
        @if (tried() && !nameOk()) { <span class="err">اكتب اسمك</span> }
      </div>

      <button class="btn primary block" type="submit">متابعة</button>
      <p class="legal">بالمتابعة توافق على <a [href]="privacy" target="_blank" rel="noopener">سياسة الخصوصية</a>. يمكنك حذف حسابك في أي وقت من «حسابي».</p>
    </form>
  </ion-content>`,
  styles: [`
    .wrap { padding: 8px 24px calc(30px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 18px; max-width: 480px; margin: 0 auto; }
    app-mark { align-self: flex-start; animation: rise .6s var(--ease-out) both; }
    .h-title { font-size: 30px; margin-top: 4px; animation: rise .6s var(--ease-out) .06s both; }
    .lead { margin: -6px 0 6px; color: var(--fg-2); line-height: 1.7; animation: rise .6s var(--ease-out) .12s both; }
    .field { animation: rise .6s var(--ease-out) .18s both; }
    @keyframes rise { from { opacity: 0; transform: translateY(14px); } }
    .phone { display: flex; align-items: stretch; border: 1.5px solid var(--aisle-2); border-radius: 14px; overflow: hidden; background: #fff; transition: border-color .2s, box-shadow .2s; direction: ltr;
      &:focus-within { border-color: var(--navy); box-shadow: 0 0 0 4px rgba(10,31,92,.08); }
      &.bad { border-color: var(--red); }
      .cc { display: grid; place-items: center; padding: 0 14px; background: var(--aisle); color: var(--fg-2); font-weight: 600; font-variant-numeric: tabular-nums; }
      input { border: 0 !important; box-shadow: none !important; border-radius: 0; letter-spacing: 1px; } }
    .btn { margin-top: 8px; }
    .legal { margin: 0; font-size: 12.5px; color: var(--muted); text-align: center; line-height: 1.7; }
  `],
})
export class WelcomePage {
  next = input<string>('/tabs/home');
  private customer = inject(CustomerStore);
  private router = inject(Router);
  private native = inject(Native);
  privacy = PRIVACY_URL;
  phone = signal(this.customer.customer()?.phone?.replace(/^0/, '') || '');
  name = signal(this.customer.customer()?.name || '');
  tried = signal(false);
  phoneOk = computed(() => !!normPhone(this.phone()));
  nameOk = computed(() => this.name().trim().length >= 2);

  go() {
    this.tried.set(true);
    const ph = normPhone(this.phone());
    if (!ph || !this.nameOk()) { this.native.warn(); return; }
    this.customer.setIdentity(ph, this.name());
    this.native.success();
    const next = this.next() || '/tabs/home';
    const needAddr = next === '/checkout' && !this.customer.hasAddress();
    this.router.navigateByUrl(needAddr ? '/address?next=/checkout' : next, { replaceUrl: true });
  }
}
