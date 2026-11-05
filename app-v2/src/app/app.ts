import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Catalog } from './core/catalog.store';
import { Native } from './core/native.service';
import { MarkComponent } from './ui/mark.component';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet, MarkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-app>
      <ion-router-outlet />
    </ion-app>
    @if (splash()) {
      <div class="splash" [class.out]="leaving()" aria-hidden="true">
        <app-mark [width]="220" [draw]="true" />
        <p class="tag">سوبرماركت حيّك · مفتوح 24 ساعة</p>
      </div>
    }
  `,
  styles: [`
    .splash {
      position: fixed; inset: 0; z-index: 100000; background: #FFFFFF;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px;
      transition: opacity .55s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1);
    }
    .splash.out { opacity: 0; transform: scale(1.08); pointer-events: none; }
    .tag { margin: 0; color: var(--fg-2); font-size: 14px; opacity: 0; animation: tag .6s ease 1.15s forwards; }
    @keyframes tag { to { opacity: 1; } }
  `],
})
export class App implements OnInit {
  private catalog = inject(Catalog);
  private native = inject(Native);
  splash = signal(true);
  leaving = signal(false);

  async ngOnInit() {
    this.native.boot();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const minShow = new Promise(r => setTimeout(r, reduced ? 200 : 1650));
    this.native.hideSplash();
    const load = this.catalog.load();
    // coming back to the app: store hours/fees first, the full catalog once it is over an hour old
    const back = () => { this.catalog.refreshSettings(); this.catalog.load(); };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) back(); });
    // never hold people on the splash longer than ~3.5s, even on a slow network
    await Promise.race([Promise.all([minShow, load]), new Promise(r => setTimeout(r, 3500))]);
    this.leaving.set(true);
    setTimeout(() => this.splash.set(false), 700);
  }
}
