// holdings.service.ts — manages the user's portfolio positions (Invest tab).
// Fetches positions via HttpClient, then combines with live SecurityViewModels
// to produce HoldingViewModels. BehaviorSubject holds mutable position state.
//
// Swapping mock → real API: update the URL in loadHoldings() — nothing else changes.

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, throwError } from 'rxjs';
import { catchError, map, retry, shareReplay } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { HoldingRaw } from '../models/holding-raw.model';
import { HoldingViewModel } from '../models/holding-view.model';
import { SecurityViewModel } from '../models/security-view.model';
import { SecurityService } from './security.service';
import { toHttpErrorMessage } from '../utils/http-error.util';

@Injectable({ providedIn: 'root' })
export class HoldingsService {
  private readonly positionsSubject = new BehaviorSubject<HoldingRaw[]>([]);
  public readonly holdings$: Observable<HoldingViewModel[]>;

  private readonly http = inject(HttpClient);
  private readonly securityService = inject(SecurityService);

  constructor() {
    // WHY: subscribe here (not in a stream) because BehaviorSubject requires a
    // synchronous initial value. loadHoldings() completes after one emission so
    // this subscription auto-cleans — no takeUntilDestroyed() needed.
    this.loadHoldings().subscribe((data) => this.positionsSubject.next(data));
    this.holdings$ = this.buildHoldingsStream();
  }

  // GET /api/holdings — swap URL for the real endpoint in environment.prod.ts
  private loadHoldings(): Observable<HoldingRaw[]> {
    return this.http.get<HoldingRaw[]>(`${environment.apiBaseUrl}/holdings.mock.json`).pipe(
      // WHY retry before catchError: re-issues the GET up to 2 times on transient failures
      // before converting the error to a readable message. GET is idempotent so retrying is safe.
      retry({ count: 2, delay: 1000 }),
      catchError((err: HttpErrorResponse) => throwError(() => new Error(toHttpErrorMessage(err)))),
    );
  }

  /**
   * Returns a slice of holdings up to `limit` items plus a `hasMore` flag.
   *
   * Mock: slices the full in-memory list.
   * Real API: replace body with GET /api/holdings?limit=N — nothing else changes.
   * WHY here (not in the page): the page only knows "how many to show";
   * the service owns the data-fetching contract.
   */
  public getHoldingsPage(limit: number): Observable<{ data: HoldingViewModel[]; hasMore: boolean }> {
    return this.holdings$.pipe(
      map((all) => ({
        data: all.slice(0, limit),
        hasMore: all.length > limit,
      })),
    );
  }

  public addHolding(symbol: string, shares: number, averageCost: number): void {
    const current = this.positionsSubject.getValue();
    const existing = current.find((p) => p.symbol === symbol);

    if (existing) {
      const totalShares = existing.shares + shares;
      const blendedCost =
        (existing.shares * existing.averageCost + shares * averageCost) / totalShares;

      // WHY: remove the old entry and prepend the updated one so the most-recently
      // traded position always floats to the top of the holdings list.
      const rest = current.filter((p) => p.symbol !== symbol);
      this.positionsSubject.next([{ symbol, shares: totalShares, averageCost: blendedCost }, ...rest]);
    } else {
      // Prepend so newly bought positions appear first.
      this.positionsSubject.next([{ symbol, shares, averageCost }, ...current]);
    }
  }

  public removeHolding(symbol: string): void {
    this.positionsSubject.next(
      this.positionsSubject.getValue().filter((p) => p.symbol !== symbol),
    );
  }

  private buildHoldingsStream(): Observable<HoldingViewModel[]> {
    return combineLatest([
      // `positionsSubject` as an Observable (hides the `.next()` method from the stream)
      this.positionsSubject.asObservable(),
      // Full securities list from SecurityService — already cached via shareReplay
      this.securityService.getSecurities(),
    ]).pipe(
      map(([positions, securities]) => this.joinHoldings(positions, securities)),
      shareReplay(1),
    );
  }

  private joinHoldings(
    positions: HoldingRaw[],
    securities: SecurityViewModel[],
  ): HoldingViewModel[] {
    // Build a lookup Map for O(1) security access during the join.
    const securityBySymbol = new Map<string, SecurityViewModel>(
      securities.map((s) => [s.symbol, s]),
    );

    const viewModels: HoldingViewModel[] = [];

    for (const position of positions) {
      const security = securityBySymbol.get(position.symbol);

      if (!security) {
        continue; // held position has no matching security data — skip
      }

      viewModels.push(this.toHoldingViewModel(position, security));
    }

    return viewModels;
  }

  private toHoldingViewModel(
    position: HoldingRaw,
    security: SecurityViewModel,
  ): HoldingViewModel {
    const unrealisedGainPercent =
      position.averageCost !== 0
        ? ((security.ask - position.averageCost) / position.averageCost) * 100
        : 0;

    const totalValue = position.shares * security.ask;

    return {
      // Spread all SecurityViewModel fields (symbol, type, fullName, logo, prices, etc.)
      ...security,
      shares: position.shares,
      averageCost: position.averageCost,
      unrealisedGainPercent,
      totalValue,
    };
  }
}
