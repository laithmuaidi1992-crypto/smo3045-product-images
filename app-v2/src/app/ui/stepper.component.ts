import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, remove, trashOutline } from 'ionicons/icons';

/** − qty + in the brand stadium. At 1 the minus turns into a bin. */
@Component({
  selector: 'app-stepper',
  imports: [IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.big]': 'big()' },
  template: `
    <button type="button" class="b" (click)="$event.stopPropagation(); dec.emit()" [attr.aria-label]="qty() === 1 ? 'حذف من السلة' : 'إنقاص الكمية'">
      <ion-icon [name]="qty() === 1 ? 'trash-outline' : 'remove'" />
    </button>
    <span class="q" aria-live="polite">{{ qty() }}</span>
    <button type="button" class="b plus" (click)="$event.stopPropagation(); inc.emit()" [disabled]="atMax()" aria-label="زيادة الكمية">
      <ion-icon name="add" />
    </button>`,
  styles: [`
    :host { display: inline-flex; align-items: center; justify-content: space-between; height: 38px; border-radius: 999px;
      background: var(--navy); color: #fff; padding: 3px; gap: 2px; min-width: 104px; animation: pop .32s cubic-bezier(.34,1.56,.64,1); }
    :host(.big) { height: 54px; min-width: 150px; padding: 5px; }
    .b { width: 32px; height: 32px; border-radius: 50%; border: 0; background: rgba(255,255,255,.12); color: #fff; display: grid; place-items: center; font-size: 18px; cursor: pointer; transition: transform .15s, background .2s; }
    :host(.big) .b { width: 44px; height: 44px; font-size: 22px; }
    .b:active { transform: scale(.88); background: rgba(255,255,255,.24); }
    .b[disabled] { opacity: .35; }
    .q { min-width: 26px; text-align: center; font-weight: 700; font-variant-numeric: tabular-nums; font-size: 15px; }
    :host(.big) .q { font-size: 19px; }
    @keyframes pop { from { transform: scale(.7); opacity: 0; } }
  `],
})
export class StepperComponent {
  qty = input.required<number>();
  atMax = input(false);
  big = input(false);
  inc = output<void>();
  dec = output<void>();
  constructor() { addIcons({ add, remove, trashOutline }); }
}
