import { CurrencyPipe, DecimalPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { IonItem } from '@ionic/angular/standalone';

import { SecurityViewModel } from '../../models/security-view.model';

/**
 * Displays one row in a securities list.
 *
 * Variant A — Discover search results (shares not provided, showPrice false):
 *   symbol | fullName
 *
 * Variant B — Recently searched / browse (shares not provided, showPrice true):
 *   symbol | fullName                    $price
 *
 * Variant C — Holding (shares provided):
 *   symbol | N shares       $price   [+X.XX% badge]
 *
 * The parent page decides which variant to activate via `shares`, `changePercent`, `showPrice`.
 * This component never reads from a service.
 */
@Component({
  selector: 'app-instrument',
  templateUrl: 'instrument.component.html',
  styleUrls: ['instrument.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonItem, CurrencyPipe, DecimalPipe, NgClass],
})

export class InstrumentComponent {
  @Input({ required: true }) security!: SecurityViewModel;
  @Input() shares: number | null = null;
  @Input() changePercent: number | null = null;
  /** Whether to render the price column. Default true; pass false for search results. */
  @Input() showPrice = true;
  @Output() readonly buyClicked = new EventEmitter<void>();

  // Returns the CSS modifier class that controls the badge colour
  get changeBadgeClass(): string {
    if (this.changePercent === null) return '';
    if (this.changePercent > 0) return 'change-badge--gain';
    if (this.changePercent < 0) return 'change-badge--loss';
    return 'change-badge--flat';
  }

  // Formats the percent value with an explicit sign: +22.90% / -5.43% / 0.00%
  get formattedChangePercent(): string {
    if (this.changePercent === null) return '';
    const sign = this.changePercent > 0 ? '+' : '';
    return `${sign}${this.changePercent.toFixed(2)}%`;
  }

  onBuyClick(): void {
    this.buyClicked.emit();
  }
}
