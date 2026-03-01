// security.service.ts — data layer for securities.
// Loads details + pricing via HttpClient, joins them on `symbol`, and exposes
// typed Observables for components to consume. No component ever touches raw JSON.
//
// Swapping mock → real API: update apiBaseUrl in environment.prod.ts and adjust
// the URL strings in the three private load methods below — nothing else changes.

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, throwError } from 'rxjs';
import { catchError, map, retry, shareReplay, take } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { RecentSearch } from '../models/recent-search.model';
import { SecurityDetail } from '../models/security-detail.model';
import { SecurityPricing } from '../models/security-pricing.model';
import { SecurityViewModel } from '../models/security-view.model';
import { toHttpErrorMessage } from '../utils/http-error.util';


@Injectable({ providedIn: 'root' })
export class SecurityService {
  // WHY first: inject() field initializers must run before any field that calls
  // methods which depend on them. Moving http here ensures this.http is defined
  // before securities$ initializer calls buildSecuritiesStream() → loadDetails().
  private readonly http = inject(HttpClient);

  private readonly securities$: Observable<SecurityViewModel[]> = this.buildSecuritiesStream();

  /**
   * Pre-sorted stream: securities with a valid volume, ranked highest-first.
   * WHY shareReplay(1): the sort runs once per source emission and the result is
   * shared across all subscribers. Without this, every call to getTopByVolume()
   * would re-sort the full array independently on each tick — O(n log n) wasted
   * work on a high-frequency pricing stream.
   */
  private readonly securitiesByVolume$: Observable<SecurityViewModel[]> =
    this.securities$.pipe(
      map((securities) =>
        securities
          // WHY: filter before sort so null volumes don't interfere with comparisons
          .filter((s): s is SecurityViewModel & { volume: number } => s.volume !== null)
          .sort((a, b) => b.volume - a.volume),
      ),
      shareReplay(1),
    );

  private readonly recentSearchesSubject = new BehaviorSubject<SecurityViewModel[]>([]);
  public readonly recentSearches$ = this.recentSearchesSubject.asObservable();

  constructor() {
    // Seed recently-searched from mock API on service init
    this.initRecentSearches();
  }

  // Returns the full list of all securities as a typed Observable
  public getSecurities(): Observable<SecurityViewModel[]> {
    return this.securities$;
  }

  // Returns the top `count` securities ranked by volume (descending).
  // WHY: delegates to securitiesByVolume$ so the sort is computed once per source
  // emission and cached — callers only pay for the cheap .slice().
  public getTopByVolume(count: number): Observable<SecurityViewModel[]> {
    return this.securitiesByVolume$.pipe(
      map((securities) => securities.slice(0, count)),
    );
  }

  // Records a security as recently searched
  public trackSearch(security: SecurityViewModel): void {
    const current = this.recentSearchesSubject.getValue();
    // Remove any existing entry for this symbol so we can re-insert at the front
    const deduplicated = current.filter((s) => s.symbol !== security.symbol);
    // Prepend the new entry and cap at 10
    this.recentSearchesSubject.next([security, ...deduplicated].slice(0, 10));
  }

  // Minimum characters before filtering kicks in.
  // WHY: queries shorter than this are too broad for a server-side endpoint (e.g. "A"
  // would match thousands of rows). Below this threshold we return the full cached list
  // so the user can browse without triggering a network round-trip.
  private static readonly MIN_SEARCH_LENGTH = 2;

  // Returns a filtered list of securities matching the query string.
  //
  // MOCK implementation (current): filters the in-memory shareReplay'd list.
  //
  // ── Server-side swap ────────────────────────────────────────────────────────
  // Replace the `return this.securities$.pipe(map(...))` block below with:
  //
  //   return this.http
  //     .get<SecurityViewModel[]>(
  //       `${environment.apiBaseUrl}/securities?q=${encodeURIComponent(normalised)}`
  //     )
  //     .pipe(retry({ count: 2, delay: 1000 }), catchError(...));
  //
  // The caller (discover.page.ts) already has debounceTime + distinctUntilChanged +
  // switchMap, so it will cancel in-flight requests and deduplicate identical queries.
  // Nothing outside this method needs to change.
  // ────────────────────────────────────────────────────────────────────────────
  public searchSecurities(query: string): Observable<SecurityViewModel[]> {
    const normalised = query.trim().toLowerCase();

    // Below the minimum length, return the full list from cache — no filter overhead,
    // no network round-trip. Preserves the "browse all" UX for short / empty queries.
    if (normalised.length < SecurityService.MIN_SEARCH_LENGTH) {
      return this.securities$;
    }

    return this.securities$.pipe(
      map((securities) =>
        securities.filter(
          (s) =>
            s.symbol.toLowerCase().includes(normalised) ||
            s.fullName.toLowerCase().includes(normalised),
        ),
      ),
    );
  }

  // Builds the core securities stream by loading both JSON files in parallel
  private buildSecuritiesStream(): Observable<SecurityViewModel[]> {
    return combineLatest([this.loadDetails(), this.loadPricing()]).pipe(
      map(([details, pricing]) => this.joinSecurities(details, pricing)),
      // Cache the result: any future subscriber gets the already-computed list instantly.
      shareReplay(1),
    );
  }

  // GET /api/securities — swap URL for the real endpoint in environment.prod.ts
  private loadDetails(): Observable<SecurityDetail[]> {
    return this.http.get<SecurityDetail[]>(`${environment.apiBaseUrl}/details.json`).pipe(
      retry({ count: 2, delay: 1000 }),
      catchError((err: HttpErrorResponse) => throwError(() => new Error(toHttpErrorMessage(err)))),
    );
  }

  // GET /api/securities/:symbol/price
  private loadPricing(): Observable<SecurityPricing[]> {
    return this.http.get<SecurityPricing[]>(`${environment.apiBaseUrl}/pricing.json`).pipe(
      retry({ count: 2, delay: 1000 }),
      catchError((err: HttpErrorResponse) => throwError(() => new Error(toHttpErrorMessage(err)))),
    );
  }

  // Joins details and pricing arrays on `symbol` to produce SecurityViewModels
  private joinSecurities(
    details: SecurityDetail[],
    pricing: SecurityPricing[],
  ): SecurityViewModel[] {
    const pricingBySymbol = new Map<string, SecurityPricing>(
      pricing.map((p) => [p.symbol, p]),
    );

    const viewModels: SecurityViewModel[] = [];

    for (const detail of details) {
      const price = pricingBySymbol.get(detail.symbol);

      if (!price) {
        // skip this security rather than render broken data.
        continue;
      }

      viewModels.push(this.toViewModel(detail, price));
    }

    return viewModels;
  }

  // GET /api/recently-searched
  private loadRecentSearches(): Observable<RecentSearch[]> {
    return this.http.get<RecentSearch[]>(`${environment.apiBaseUrl}/recently-searched.mock.json`).pipe(
      retry({ count: 2, delay: 1000 }),
      catchError((err: HttpErrorResponse) => throwError(() => new Error(toHttpErrorMessage(err)))),
    );
  }

  /**
   * Seeds recentSearchesSubject from the mock API on service startup.
   * Joins the raw symbol list with the full securities stream to produce ViewModels.
   * take(1): securities$ is shareReplay'd so this only needs to run once.
   */
  private initRecentSearches(): void {
    combineLatest([this.loadRecentSearches(), this.securities$])
      .pipe(
        // WHY: take(1) completes the subscription after the first combined emission —
        // both sources have emitted at least once (after the HTTP response arrives).
        take(1),
        map(([recent, securities]) => {
          const bySymbol = new Map(securities.map((s) => [s.symbol, s]));
          // Map each raw { symbol } record to its full ViewModel; skip unknowns.
          return recent
            .map((r) => bySymbol.get(r.symbol))
            .filter((s): s is SecurityViewModel => s !== undefined);
        }),
      )
      .subscribe((viewModels) => {
        this.recentSearchesSubject.next(viewModels);
      });
  }

  // Merges one SecurityDetail + one SecurityPricing into a SecurityViewModel
  private toViewModel(detail: SecurityDetail, price: SecurityPricing): SecurityViewModel {
    // (ask - close) / close * 100
    const priceChangePercent =
      price.close !== 0 ? ((price.ask - price.close) / price.close) * 100 : 0;

    return {
      symbol: detail.symbol,
      type: detail.type,
      fullName: detail.fullName,
      logo: detail.logo,
      volume: detail.volume,
      marketCap: detail.marketCap,
      open: price.open,
      close: price.close,
      ask: price.ask,
      high: price.high,
      low: price.low,
      priceChangePercent,
    };
  }
}
