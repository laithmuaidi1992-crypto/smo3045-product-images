import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The 3045 stadium mark, redrawn as SVG so it can animate: red arc over, navy arc under. */
@Component({
  selector: 'app-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.draw]': 'draw()', '[class.light]': 'light()', '[style.width.px]': 'width()' },
  template: `
  <svg viewBox="0 0 300 132" role="img" aria-label="3045 Supermarket">
    <path class="arc top" d="M12,68 A56,56 0 0 1 68,12 H232 A56,56 0 0 1 288,68" />
    <path class="arc bottom" d="M288,64 A56,56 0 0 1 232,120 H68 A56,56 0 0 1 12,64" />
    <text class="num" x="150" y="76" text-anchor="middle">3045</text>
    <rect class="rule" x="78" y="86" width="144" height="4" rx="2" />
    <text class="word" x="150" y="106" text-anchor="middle">SUPERMARKET</text>
  </svg>`,
  styles: [`
    :host { display: inline-block; direction: ltr; }
    svg { width: 100%; height: auto; display: block; overflow: visible; }
    .arc { fill: none; stroke-width: 7; stroke-linecap: round; }
    .top { stroke: var(--red); transform: translate(2px, -1px); }
    .bottom { stroke: var(--navy); stroke-width: 9; transform: translate(-1px, 2px); }
    .num { font: 700 52px 'Readex Pro', serif; fill: var(--navy); letter-spacing: 1px; }
    .rule { fill: var(--red); transform-origin: 150px 88px; }
    .word { font: 600 11px 'Readex Pro', sans-serif; fill: var(--navy); letter-spacing: 4px; }
    :host(.light) .bottom { stroke: #fff; } :host(.light) .num, :host(.light) .word { fill: #fff; }
    :host(.draw) .arc { stroke-dasharray: 400; stroke-dashoffset: 400; animation: draw .9s cubic-bezier(.65,0,.35,1) forwards; }
    :host(.draw) .bottom { animation-delay: .18s; }
    :host(.draw) .num { opacity: 0; transform: translateY(10px); animation: rise .6s cubic-bezier(.16,1,.3,1) .55s forwards; }
    :host(.draw) .rule { transform: scaleX(0); animation: grow .5s cubic-bezier(.16,1,.3,1) .8s forwards; }
    :host(.draw) .word { opacity: 0; animation: fade .5s ease .95s forwards; }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    @keyframes rise { to { opacity: 1; transform: none; } }
    @keyframes grow { to { transform: scaleX(1); } }
    @keyframes fade { to { opacity: 1; } }
  `],
})
export class MarkComponent {
  width = input(180);
  draw = input(false);
  /** white navy-parts, for dark backgrounds */
  light = input(false);
}
