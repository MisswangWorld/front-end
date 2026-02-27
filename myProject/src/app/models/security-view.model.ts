// security-view.model.ts — joined ViewModel produced by SecurityService, consumed by all components.
// id is intentionally excluded: the two source files have different id values for the same security.

import { SecurityType } from './security-detail.model';

export type SecurityViewModel = {
  // from SecurityDetail
  readonly symbol: string;
  readonly type: SecurityType;
  readonly fullName: string;
  readonly logo: string;
  readonly volume: number | null;
  readonly marketCap: number | null;

  // from SecurityPricing
  readonly open: number;
  readonly close: number;
  readonly ask: number;
  readonly high: number;
  readonly low: number;

  // computed: (ask - close) / close * 100
  readonly priceChangePercent: number;
};
