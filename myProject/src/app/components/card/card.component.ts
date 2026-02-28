import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { IonCard, IonCardContent } from '@ionic/angular/standalone';

import { SecurityViewModel } from '../../models/security-view.model';
import { TypeBadgeComponent } from '../type-badge/type-badge.component';

export type CardSize = 'large' | 'medium' | 'small';

/**
 * Displays a security as a card tile.
 *
 * Size variants (Figma):
 *  - large  : full-width featured card with logo, price, name, and metrics row
 *  - medium : horizontal-scroll card with logo, symbol, price, and name
 *  - small  : compact tile with logo, type badge, symbol, name, and price
 *
 * Parent controls the display size via the `size` input.
 */
@Component({
  selector: 'app-card',
  templateUrl: 'card.component.html',
  styleUrls: ['card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonCard, IonCardContent, CurrencyPipe, TypeBadgeComponent],
})
export class CardComponent {
  @Input({ required: true }) security!: SecurityViewModel;

  @Input() size: CardSize = 'medium';

  @Output() readonly buyClicked = new EventEmitter<void>();

  get nameLabel(): string {
    return `${this.security.symbol} • ${this.security.fullName}`;
  }

  /** null → '—', 36900000 → '$36.9m'. Only shown on large cards. */
  get formattedVolume(): string {
    return this.formatMetric(this.security.volume);
  }

  /** null → '—', 1200000000 → '$1.2b'. Only shown on large cards. */
  get formattedMarketCap(): string {
    return this.formatMetric(this.security.marketCap);
  }

  /** "$30–32" price range from low/high. Only shown on large cards. */
  get priceRange(): string {
    const lo = Math.round(this.security.low);
    const hi = Math.round(this.security.high);
    return `$${lo}–${hi}`;
  }

  onBuyClick(): void {
    this.buyClicked.emit();
  }

  private formatMetric(value: number | null): string {
    if (value === null) return '—';
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}b`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}m`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
    return `$${value}`;
  }
}
