// type-badge.component.ts — dumb badge that renders the security type label.
// Colour is driven entirely by CSS (badge--stock / badge--etf / badge--otc modifier).

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { SecurityType } from '../../models/security-detail.model';

/** Renders a small coloured label for a security's type: Stock, ETF, or OTC. */
@Component({
  selector: 'app-type-badge',
  templateUrl: 'type-badge.component.html',
  styleUrls: ['type-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypeBadgeComponent {
  /** The security type that determines both the display label and the CSS colour modifier. */
  @Input({ required: true }) type!: SecurityType;

  // Static map avoids repeated string literals and makes adding new types a one-line change.
  private static readonly LABELS: Record<SecurityType, string> = {
    stock: 'Stock',
    etf: 'ETF',
    otc: 'OTC',
  };

  /** Human-readable label derived from the type input. */
  get label(): string {
    return TypeBadgeComponent.LABELS[this.type];
  }
}
