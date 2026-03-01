// recent-search.model.ts — raw shape returned by GET /api/recently-searched.
// Intentionally lean: the API stores only the symbol reference.
// SecurityService joins this with details + pricing to produce SecurityViewModel.

/** Raw record from GET /api/recently-searched */
export type RecentSearch = {
  readonly symbol: string;
};
