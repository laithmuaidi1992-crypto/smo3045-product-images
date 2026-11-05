import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AlertController, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { callOutline, chevronForward, documentTextOutline, helpBuoyOutline, locationOutline, logOutOutline, notificationsOutline, personOutline, trashOutline } from 'ionicons/icons';
import { errText } from '../../core/api.service';
import { Catalog } from '../../core/catalog.store';
import { CustomerStore } from '../../core/customer.store';
import { NATIVE, PRIVACY_URL, SUPPORT_URL } from '../../core/env';
import { Native } from '../../core/native.service';
import { OrdersStore } from '../../core/orders.store';
import { Ui } from '../../core/ui.service';
import { MarkComponent } from '../../ui/mark.component';

export const APP_VERSION = '2.0.0';

@Component({
  selector: 'app-account',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, RouterLink, MarkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <ion-header [translucent]="true"><ion-toolbar><ion-title>حسابي</ion-title></ion-toolbar></ion-header>
  <ion-content [fullscreen]="true">
    <ion-header collapse="condense"><ion-toolbar><ion-title size="large">حسابي</ion-title></ion-toolbar></ion-header>
    <div class="wrap">
      @if (customer.signedIn()) {
        <section class="card me">
          <span class="av">{{ initial() }}</span>
          <div><b>{{ customer.customer()?.name }}</b><span dir="ltr">{{ customer.customer()?.phone }}</span></div>
          <a class="edit" routerLink="/welcome" [queryParams]="{ next: '/tabs/account' }">تعديل</a>
        </section>
      } @else {
        <section class="card guest">
          <b>سجّل برقم هاتفك</b>
          <p>حتى نوصل طلباتك ونحفظ عنوانك. لا كلمات مرور.</p>
          <a class="btn primary" routerLink="/welcome" [queryParams]="{ next: '/tabs/account' }">متابعة</a>
        </section>
      }

      <nav class="group">
        <a class="item" [routerLink]="customer.signedIn() ? '/address' : '/welcome'" [queryParams]="{ next: customer.signedIn() ? '/tabs/account' : '/address' }">
          <ion-icon name="location-outline" /><span><b>عنوان التوصيل</b><small>{{ customer.addressLine() || 'لم تضف عنوانًا بعد' }}</small></span><ion-icon class="go" name="chevron-forward" />
        </a>
        @if (native) {
          <button class="item" type="button" (click)="push()">
            <ion-icon name="notifications-outline" /><span><b>إشعارات الطلب</b><small>نخبرك عند كل خطوة حتى الباب</small></span><ion-icon class="go" name="chevron-forward" />
          </button>
        }
        <a class="item" routerLink="/tabs/orders">
          <ion-icon name="document-text-outline" /><span><b>طلباتي</b><small>تتبع وتكرار الطلبات</small></span><ion-icon class="go" name="chevron-forward" />
        </a>
      </nav>

      <nav class="group">
        @if (catalog.settings().store_phone) {
          <a class="item" [href]="'tel:' + catalog.settings().store_phone">
            <ion-icon name="call-outline" /><span><b>اتصل بالمتجر</b><small dir="ltr">{{ catalog.settings().store_phone }}</small></span><ion-icon class="go" name="chevron-forward" />
          </a>
        }
        <button class="item" type="button" (click)="nat.open(support)"><ion-icon name="help-buoy-outline" /><span><b>المساعدة والدعم</b></span><ion-icon class="go" name="chevron-forward" /></button>
        <button class="item" type="button" (click)="nat.open(privacy)"><ion-icon name="document-text-outline" /><span><b>سياسة الخصوصية</b></span><ion-icon class="go" name="chevron-forward" /></button>
      </nav>

      @if (customer.signedIn()) {
        <nav class="group">
          <button class="item" type="button" (click)="signOut()"><ion-icon name="log-out-outline" /><span><b>تسجيل الخروج</b></span></button>
          <button class="item danger" type="button" (click)="del()" [disabled]="busy()"><ion-icon name="trash-outline" /><span><b>حذف الحساب</b><small>يحذف بياناتك نهائيًا</small></span></button>
        </nav>
      }

      <footer>
        <app-mark [width]="40" />
        <span><bdi dir="ltr">3045 Market</bdi> · الإصدار {{ version }}</span>
        <span>سوبرماركت حيّك، مفتوح 24 ساعة · إربد</span>
      </footer>
    </div>
  </ion-content>`,
  styles: [`
    .wrap { padding: 4px 16px 40px; display: flex; flex-direction: column; gap: 18px; }
    .card { padding: 18px; border-radius: 24px; background: var(--aisle); }
    .me { display: flex; align-items: center; gap: 14px; div { flex: 1; display: flex; flex-direction: column; gap: 2px; b { font-size: 17px; } span { font-size: 14px; color: var(--fg-2); text-align: start; } } }
    .av { width: 54px; height: 54px; border-radius: 50%; background: var(--navy); color: #fff; display: grid; place-items: center; font-size: 22px; font-weight: 700; box-shadow: inset 0 -4px 0 var(--red); }
    .edit { font-weight: 700; color: var(--navy); text-decoration: none; font-size: 14px; }
    .guest { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; b { font-size: 18px; } p { margin: 0 0 8px; color: var(--fg-2); font-size: 14px; } }
    .group { border-radius: 24px; background: var(--aisle); overflow: hidden; display: flex; flex-direction: column; }
    .item { display: flex; align-items: center; gap: 14px; padding: 15px 16px; min-height: 58px; border: 0; background: none; font: inherit; color: var(--fg); text-align: start; text-decoration: none; cursor: pointer; width: 100%;
      & + .item { border-top: 1px solid var(--aisle-2); }
      > ion-icon:first-child { font-size: 22px; color: var(--navy); flex: none; }
      span { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; b { font-size: 15px; font-weight: 600; } small { font-size: 12.5px; color: var(--fg-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } }
      .go { color: var(--muted); font-size: 17px; }
      &:active { background: var(--aisle-2); } }
    .danger { color: var(--red); > ion-icon:first-child { color: var(--red); } }
    footer { display: flex; flex-direction: column; align-items: center; gap: 4px; padding-top: 12px; color: var(--muted); font-size: 12px; app-mark { color: var(--navy); opacity: .5; margin-bottom: 6px; } }
  `],
})
export class AccountPage {
  customer = inject(CustomerStore);
  catalog = inject(Catalog);
  nat = inject(Native);
  private orders = inject(OrdersStore);
  private alerts = inject(AlertController);
  private ui = inject(Ui);
  private router = inject(Router);
  native = NATIVE;
  version = APP_VERSION;
  support = SUPPORT_URL;
  privacy = PRIVACY_URL;
  busy = signal(false);

  constructor() { addIcons({ callOutline, chevronForward, documentTextOutline, helpBuoyOutline, locationOutline, logOutOutline, notificationsOutline, personOutline, trashOutline }); }

  initial() { return (this.customer.firstName() || '؟').charAt(0); }

  async push() {
    const ok = await this.nat.askPush();
    this.ui.toast(ok ? 'الإشعارات مفعّلة' : 'فعّل الإشعارات من إعدادات الآيفون › 3045 Market', ok ? 'ok' : 'err', 3500);
  }

  async signOut() {
    const a = await this.alerts.create({
      header: 'تسجيل الخروج؟', message: 'سلتك تبقى محفوظة على هذا الجهاز.', mode: 'ios',
      buttons: [{ text: 'إلغاء', role: 'cancel' }, { text: 'خروج', role: 'destructive', handler: () => { this.customer.signOut(); this.orders.forget(); this.ui.toast('سجّلت الخروج'); } }],
    });
    a.present();
  }

  async del() {
    const a = await this.alerts.create({
      header: 'حذف الحساب نهائيًا؟', mode: 'ios',
      message: 'سنحذف اسمك ورقمك وعنوانك وسجل طلباتك من هذا الجهاز وخوادمنا. لا يمكن التراجع.',
      buttons: [{ text: 'إلغاء', role: 'cancel' }, { text: 'احذف الحساب', role: 'destructive', handler: () => { this.reallyDelete(); } }],
    });
    a.present();
  }
  private async reallyDelete() {
    this.busy.set(true);
    try {
      await this.customer.deleteAccount();
      this.orders.forget();
      this.nat.success();
      this.ui.toast('حُذف حسابك');
      this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
    } catch (e) { this.ui.toast(errText(e), 'err'); }
    finally { this.busy.set(false); }
  }
}
