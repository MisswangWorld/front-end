// security.service.ts — data layer for securities.
// Loads details.json + pricing.json, joins them on `symbol`, and exposes
// typed Observables for components to consume. No component ever touches raw JSON.

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { delay, map, shareReplay } from 'rxjs/operators';

import { SecurityDetail } from '../models/security-detail.model';
import { SecurityPricing } from '../models/security-pricing.model';
import { SecurityViewModel } from '../models/security-view.model';

import { SIMULATED_DELAY_MS } from '../constants';

// If we later switch to real HttpClient.get(), only this file changes.
import detailsData from '../../assets/data/details.json';
import pricingData from '../../assets/data/pricing.json';


@Injectable({ providedIn: 'root' })
export class SecurityService {
  private readonly securities$: Observable<SecurityViewModel[]> = this.buildSecuritiesStream();
  private readonly recentSearchesSubject = new BehaviorSubject<SecurityViewModel[]>([]);
  public readonly recentSearches$ = this.recentSearchesSubject.asObservable();

  // Returns the full list of all securities as a typed Observable
  public getSecurities(): Observable<SecurityViewModel[]> {
    return this.securities$;
  }

  // Returns the top `count` securities ranked by volume (descending)
  public getTopByVolume(count: number): Observable<SecurityViewModel[]> {
    return this.securities$.pipe(
      map((securities) =>
        securities
          // WHY: filter first so nulls don't interfere with the sort comparison
          .filter((s): s is SecurityViewModel & { volume: number } => s.volume !== null)
          // Sort descending — highest volume first
          .sort((a, b) => b.volume - a.volume)
          // Take only the requested number of results
          .slice(0, count),
      ),
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

  // Returns a filtered list of securities matching the query string
  public searchSecurities(query: string): Observable<SecurityViewModel[]> {
    const normalised = query.trim().toLowerCase();

    return this.securities$.pipe(
      map((securities) => {
        if (!normalised) {
          return securities; // empty query → return everything
        }
        return securities.filter(
          (s) =>
            s.symbol.toLowerCase().includes(normalised) ||
            s.fullName.toLowerCase().includes(normalised),
        );
      }),
    );
  }

  
  // Builds the core securities stream by loading both JSON files in parallel
  private buildSecuritiesStream(): Observable<SecurityViewModel[]> {
    const details$ = this.loadDetails();
    const pricing$ = this.loadPricing();

    return (
      combineLatest([details$, pricing$]).pipe(
        map(([details, pricing]) => this.joinSecurities(details, pricing)),
        // Cache the result: any future subscriber gets the already-computed list instantly.
        shareReplay(1),
      )
    );
  }

  // Simulates GET /api/securities
  private loadDetails(): Observable<SecurityDetail[]> {
    return of(detailsData as SecurityDetail[]).pipe(delay(SIMULATED_DELAY_MS));
  }

  // Simulates GET /api/securities/:symbol/price
  private loadPricing(): Observable<SecurityPricing[]> {
    return of(pricingData as SecurityPricing[]).pipe(delay(SIMULATED_DELAY_MS));
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
