import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { NATIVE } from './env';
import { store } from './store';

/** Everything that touches the device. Every call is a safe no-op on the web. */
@Injectable({ providedIn: 'root' })
export class Native {
  private router = inject(Router);
  private zone = inject(NgZone);
  private pushReady = false;
  /** set by the customer store so a new token is tied to the right phone */
  onToken: (token: string) => void = () => {};

  get pushToken(): string | null { return store.get<string | null>('v2_push_token', store.get<string | null>('smo_push_token', null)); }

  async boot() {
    if (!NATIVE) return;
    document.documentElement.classList.add('native');
    try { await StatusBar.setStyle({ style: Style.Light }); } catch {}
    try { await Keyboard.setResizeMode({ mode: KeyboardResize.Native }); } catch {}
    try { await Keyboard.setAccessoryBarVisible({ isVisible: true }); } catch {}
    this.initPush();
  }
  /** light text on dark screens (order placed), dark text everywhere else */
  statusBar(onDark: boolean) { if (NATIVE) StatusBar.setStyle({ style: onDark ? Style.Dark : Style.Light }).catch(() => {}); }
  async hideSplash() { if (NATIVE) { try { await SplashScreen.hide({ fadeOutDuration: 200 }); } catch {} } }

  tap() { if (NATIVE) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}); else this.vibrate(6); }
  thud() { if (NATIVE) Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {}); else this.vibrate(12); }
  success() { if (NATIVE) Haptics.notification({ type: NotificationType.Success }).catch(() => {}); else this.vibrate([10, 40, 18]); }
  warn() { if (NATIVE) Haptics.notification({ type: NotificationType.Warning }).catch(() => {}); else this.vibrate(20); }
  selection() { if (NATIVE) Haptics.selectionChanged().catch(() => {}); }
  private vibrate(p: number | number[]) { try { (navigator as any).vibrate?.(p); } catch {} }

  async locate(): Promise<{ lat: number; lng: number }> {
    if (NATIVE) {
      const perm = await Geolocation.checkPermissions().catch(() => null);
      if (perm && perm.location !== 'granted') await Geolocation.requestPermissions().catch(() => null);
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 12000 });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    }
    return new Promise((res, rej) => {
      if (!navigator.geolocation) return rej(new Error('unsupported'));
      navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude }), rej, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
    });
  }

  open(url: string) { window.open(url, '_blank', 'noopener'); }

  /* ---------- push (APNs) ---------- */
  private initPush() {
    if (!NATIVE || this.pushReady) return;
    this.pushReady = true;
    PushNotifications.addListener('registration', t => {
      if (t?.value) { store.set('v2_push_token', t.value); this.onToken(t.value); }
    });
    PushNotifications.addListener('pushNotificationActionPerformed', a => {
      const no = (a?.notification?.data as any)?.order_no;
      if (no) this.zone.run(() => this.router.navigate(['/order', no]));
    });
    PushNotifications.checkPermissions().then(p => { if (p.receive === 'granted') PushNotifications.register(); }).catch(() => {});
  }
  /** asked after the first order, never at launch */
  async askPush(): Promise<boolean> {
    if (!NATIVE) return false;
    this.initPush();
    try {
      let p = await PushNotifications.checkPermissions();
      if (p.receive === 'prompt' || p.receive === 'prompt-with-rationale') p = await PushNotifications.requestPermissions();
      if (p.receive === 'granted') { await PushNotifications.register(); return true; }
    } catch {}
    return false;
  }
  /** fallback alert while the app is open and push is off */
  async localAlert(title: string, body: string) {
    if (!NATIVE || this.pushToken) return;
    try {
      const p = await LocalNotifications.checkPermissions();
      if (p.display !== 'granted') await LocalNotifications.requestPermissions();
      await LocalNotifications.schedule({ notifications: [{ id: Math.floor(Math.random() * 2e9), title, body }] });
    } catch {}
  }
}
