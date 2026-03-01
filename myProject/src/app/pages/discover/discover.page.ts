// discover.page.ts — smart container for the Discover tab.
// Two states: default (recently searched + top 3 stocks) and focused (search results).

import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
} from '@angular/core';
import {
  IonContent,
  IonList,
  IonSearchbar,
  IonSpinner,
} from '@ionic/angular/standalone';
import {
  BehaviorSubject,
  Observable,
  catchError,
  debounceTime,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';

import { CardComponent } from '../../components/card/card.component';
import { InstrumentComponent } from '../../components/instrument/instrument.component';
import {
  BuyConfirmedPayload,
  OrderFormComponent,
} from '../../components/order-form/order-form.component';
import { SecurityViewModel } from '../../models/security-view.model';
import { HoldingsService } from '../../services/holdings.service';
import { SecurityService } from '../../services/security.service';

type SecuritiesState =
  | { status: 'loading' }
  | { status: 'success'; data: SecurityViewModel[] }
  | { status: 'error'; error: string };

type TopStocksState =
  | { status: 'loading' }
  | { status: 'success'; data: SecurityViewModel[] }
  | { status: 'error'; error: string };

/**
 * DiscoverPage — two-mode browse/search experience.
 * Default: shows recently searched securities + top 3 by volume (large cards).
 * Focused: shows filtered full list as the user types.
 */
@Component({
  selector: 'page-discover',
  templateUrl: 'discover.page.html',
  styleUrls: ['discover.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    CardComponent,
    IonContent,
    IonList,
    IonSearchbar,
    IonSpinner,
    InstrumentComponent,
    OrderFormComponent,
  ],
})
export class DiscoverPage {
  private readonly securityService = inject(SecurityService);
  private readonly holdingsService = inject(HoldingsService);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Controls which view is shown: default browse vs active search. */
  isFocused = false;

  private readonly searchQuery = new BehaviorSubject<string>('');

  /**
   * Top 3 securities by volume for the default view.
   * startWith ensures the template has a non-null state on first render.
   */
  readonly topStocksState$: Observable<TopStocksState> =
    this.securityService.getTopByVolume(3).pipe(
      map((data) => ({ status: 'success' as const, data })),
      startWith({ status: 'loading' as const }),
      catchError(() =>
        of({ status: 'error' as const, error: 'Failed to load.' }),
      ),
    );

  /**
   * Last 3 viewed securities from the service's BehaviorSubject.
   * startWith([]) guards against the async pipe returning null on first render.
   */
  readonly recentSearches$: Observable<SecurityViewModel[]> =
    this.securityService.recentSearches$.pipe(
      map((list) => list.slice(0, 3)),
      startWith([] as SecurityViewModel[]),
    );

  /**
   * Full reactive search pipeline — active when the searchbar is focused.
   * Outer startWith guards against the 200ms debounce window emitting nothing.
   */
  readonly securitiesState$: Observable<SecuritiesState> = this.searchQuery.pipe(
    debounceTime(200),
    switchMap((query) =>
      this.securityService.searchSecurities(query).pipe(
        map((data) => ({ status: 'success' as const, data })),
        startWith({ status: 'loading' as const }),
        catchError(() =>
          of({ status: 'error' as const, error: 'Failed to load securities.' }),
        ),
      ),
    ),
    // WHY: debounceTime delays the first emission; this ensures a non-null initial state
    startWith({ status: 'loading' as const }),
  );

  selectedSecurity: SecurityViewModel | null = null;

  trackBySymbol(_index: number, security: SecurityViewModel): string {
    return security.symbol;
  }

  handleSearchFocus(): void {
    this.isFocused = true;
    this.cdr.markForCheck();
  }

  handleSearchBlur(): void {
    // WHY: delay allows tap events on list items to fire before the list disappears.
    // On mobile, sequence is: touchstart → blur → touchend → click.
    // Without the delay, the list hides before the click registers.
    setTimeout(() => {
      this.isFocused = false;
      this.cdr.markForCheck();
    }, 200);
  }

  handleSearch(event: CustomEvent): void {
    this.searchQuery.next((event.detail.value as string) ?? '');
  }

  handleBuyClick(security: SecurityViewModel): void {
    // WHY: only record a search when the user is actively searching (focused mode).
    // Tapping from the recently-searched list or top-3 cards should not mutate search history.
    if (this.isFocused) {
      this.securityService.trackSearch(security);
    }
    this.selectedSecurity = security;
    this.cdr.markForCheck();
  }

  handleBuyConfirmed(payload: BuyConfirmedPayload): void {
    const pricePerShare = payload.amount / payload.shares;
    this.holdingsService.addHolding(payload.symbol, payload.shares, pricePerShare);
  }

  handleDismiss(): void {
    this.selectedSecurity = null;
    this.cdr.markForCheck();
  }
}
