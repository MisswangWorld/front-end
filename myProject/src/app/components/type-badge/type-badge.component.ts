import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { SecurityType } from '../../models/security-detail.model';

@Component({
  selector: 'app-type-badge',
  templateUrl: 'type-badge.component.html',
  styleUrls: ['type-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class TypeBadgeComponent {
  // type is required, cannot be null or undefined
  @Input({ required: true }) type!: SecurityType;

  private static readonly LABELS: Record<SecurityType, string> = {
    stock: 'Stock',
    etf: 'ETF',
    otc: 'OTC',
  };

  get label(): string {
    return TypeBadgeComponent.LABELS[this.type];
  }
}
