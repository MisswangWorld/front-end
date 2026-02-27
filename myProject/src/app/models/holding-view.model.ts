// holding-view.model.ts — Invest page ViewModel.
// SecurityViewModel + position-specific fields produced by HoldingsService.

import { SecurityViewModel } from './security-view.model';

export type HoldingViewModel = SecurityViewModel & {
  readonly shares: number;
  readonly averageCost: number;
  // (ask - averageCost) / averageCost * 100
  readonly unrealisedGainPercent: number;
  // shares * ask
  readonly totalValue: number;
};
