import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

@Injectable({ providedIn: 'root' })
export class Ui {
  private toasts = inject(ToastController);
  private current: HTMLIonToastElement | null = null;

  async toast(message: string, kind: 'ok' | 'err' = 'ok', ms = 2200) {
    try { await this.current?.dismiss(); } catch {}
    const t = await this.toasts.create({
      message, duration: ms, position: 'top', cssClass: ['t3045', kind === 'err' ? 'err' : ''],
      positionAnchor: undefined, swipeGesture: 'vertical',
    });
    this.current = t;
    await t.present();
  }

  /** The product photo leaves its card and lands in the cart: an arc, a shrink, and a bump on arrival. */
  fly(from: HTMLElement | null, src: string | null) {
    const target = document.querySelector<HTMLElement>('[data-cart-target]:not([hidden])');
    if (!from || !target || !src || reduced()) { this.bump(target); return; }
    const a = from.getBoundingClientRect(), b = target.getBoundingClientRect();
    if (!a.width || !b.width) { this.bump(target); return; }
    const size = Math.min(a.width, a.height, 120);
    const el = document.createElement('div');
    el.className = 'fly-thumb';
    el.style.cssText = `width:${size}px;height:${size}px;left:${a.left + (a.width - size) / 2}px;top:${a.top + (a.height - size) / 2}px`;
    el.innerHTML = `<img src="${src}" alt="">`;
    document.body.appendChild(el);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const anim = el.animate([
      { transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 },
      { transform: `translate(${dx * .45}px, ${dy * .45 - 120}px) scale(.62) rotate(-8deg)`, opacity: 1, offset: .45 },
      { transform: `translate(${dx}px, ${dy}px) scale(.16) rotate(6deg)`, opacity: .2 },
    ], { duration: 720, easing: 'cubic-bezier(.5,0,.3,1)' });
    anim.onfinish = () => { el.remove(); this.bump(target); };
  }
  bump(el: HTMLElement | null) {
    if (!el || reduced()) return;
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(.94)' }, { transform: 'scale(1)' }],
      { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  }
}
