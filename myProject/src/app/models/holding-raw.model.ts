// holding-raw.model.ts — raw shape of GET /api/holdings response.
// Only used inside HoldingsService to type the mock data before enrichment.

export type HoldingRaw = {
  readonly symbol: string;
  readonly shares: number;
  readonly averageCost: number;
};
