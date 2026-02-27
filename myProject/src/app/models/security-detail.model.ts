// security-detail.model.ts — raw shape of details.json. 
// Only used inside SecurityService.

export type SecurityType = 'stock' | 'etf' | 'otc';

export type SecurityDetail = {
  readonly id: string;
  readonly symbol: string;
  readonly type: SecurityType;
  readonly fullName: string;
  readonly logo: string;
  readonly volume: number | null;   // null for some securities in the dataset
  readonly marketCap: number | null;
};
