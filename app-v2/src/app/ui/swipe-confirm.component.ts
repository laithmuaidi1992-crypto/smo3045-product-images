import { ChangeDetectionStrategy, Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForward, checkmark } from 'ionicons/icons';
import { Native } from '../core/native.service';

/** Swipe the knob across the stadium to place the order (right → left, the reading direction).
 *  A screen-reader button does the same in one action. */
@Component({
  selector: 'app-swipe-confirm',
  imports: [IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.disabled]': 'disabled()', '[class.done]': 'done()', '[class.busy]': 'busy()' },
  template: `
    <div class="track" #track>
      <div class="fill" [style.width.px]="x() + 58"></div>
      <span class="label" [style.opacity]="1 - progress() * 1.4">{{ busy() ? busyLabel() : label() }}</span>
      <div class="knob" [style.transform]="'translateX(' + (-x()) + 'px)'"
           (pointerdown)="down($event)" (pointermove)="move($event)" (pointerup)="up()" (pointercancel)="up()">
        @if (done() || busy()) { <span class="spin"></span> } @else { <ion-icon name="chevron-forward" /><ion-icon name="chevron-forward" class="b" /> }
      </div>
      <button class="sr" type="button" (click)="confirm.emit()" [disabled]="disabled() || busy()">{{ label() }}</button>
    </div>`,
  styles: [`
    :host { display: block; touch-action: pan-y; }
    .track { position: relative; height: 64px; border-radius: 999px; background: var(--navy); overflow: hidden; user-select: none; -webkit-user-select: none; }
    .track::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 3px; background: var(--red); z-index: 1; }
    .fill { position: absolute; inset-block: 0; right: 0; background: linear-gradient(270deg, #1b3a96, var(--red)); border-radius: 999px; }
    .label { position: absolute; inset: 0; display: grid; place-items: center; color: #fff; font-weight: 600; font-size: 16.5px; padding-inline-start: 60px;
      background: linear-gradient(90deg, rgba(255,255,255,.55) 0%, #fff 40%, rgba(255,255,255,.55) 80%); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: sheen 2.4s linear infinite; }
    @keyframes sheen { from { background-position: 200% 0; } to { background-position: -200% 0; } }
    .knob { position: absolute; top: 4px; right: 4px; width: 56px; height: 56px; border-radius: 50%; background: #fff; color: var(--navy); display: grid; grid-auto-flow: column; place-content: center;
      font-size: 20px; box-shadow: 0 6px 16px rgba(0,0,0,.25); cursor: grab; touch-action: none; z-index: 2; }
    .knob .b { margin-inline-start: -12px; opacity: .45; }
    :host(.disabled) { opacity: .45; pointer-events: none; }
    .spin { width: 22px; height: 22px; border-radius: 50%; border: 3px solid var(--aisle-2); border-top-color: var(--navy); animation: s .8s linear infinite; }
    @keyframes s { to { transform: rotate(360deg); } }
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; padding: 0; }
  `],
})
export class SwipeConfirmComponent {
  label = input('اسحب لتأكيد الطلب');
  busyLabel = input('نرسل طلبك…');
  disabled = input(false);
  busy = input(false);
  confirm = output<void>();
  private native = inject(Native);
  private track = viewChild.required<ElementRef<HTMLElement>>('track');
  x = signal(0);
  progress = signal(0);
  done = signal(false);
  private start = 0;
  private dragging = false;
  private max = 0;
  private armed = false;

  constructor() { addIcons({ chevronForward, checkmark }); }

  down(e: PointerEvent) {
    if (this.disabled() || this.busy()) return;
    this.dragging = true; this.armed = false;
    this.start = e.clientX + this.x();
    this.max = this.track().nativeElement.clientWidth - 64;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  move(e: PointerEvent) {
    if (!this.dragging) return;
    const x = Math.max(0, Math.min(this.max, this.start - e.clientX));
    this.x.set(x); this.progress.set(x / this.max);
    if (!this.armed && x / this.max > .86) { this.armed = true; this.native.thud(); }
    if (this.armed && x / this.max < .8) this.armed = false;
  }
  up() {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.x() / this.max > .86) {
      this.x.set(this.max); this.progress.set(1); this.done.set(true);
      this.confirm.emit();
      setTimeout(() => this.reset(), 1600);
    } else this.reset();
  }
  reset() { this.done.set(false); this.x.set(0); this.progress.set(0); }
}
