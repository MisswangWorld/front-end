// security-pricing.model.ts — raw shape of pricing.json. 
// Only used inside SecurityService.

export type SecurityPricing = {
  readonly id: string;
  readonly symbol: string;
  readonly open: number;
  readonly close: number;
  readonly ask: number; // used as current price throughout the UI
  readonly high: number;
  readonly low: number;
};
