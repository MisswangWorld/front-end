// invest.page.ts — smart container for the Invest tab (Dashboard).
// Orchestrates HoldingsService (portfolio) and SecurityService (trending).

import { AsyncPipe, CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
} from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonList,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { BehaviorSubject, Observable, catchError, map, of, startWith, switchMap } from 'rxjs';

import { CardComponent } from '../../components/card/card.component';
import { InstrumentComponent } from '../../components/instrument/instrument.component';
import {
  BuyConfirmedPayload,
  OrderFormComponent,
} from '../../components/order-form/order-form.component';
import { AsyncState } from '../../models/async-state.model';
import { HoldingViewModel } from '../../models/holding-view.model';
import { SecurityViewModel } from '../../models/security-view.model';
import { HoldingsService } from '../../services/holdings.service';
import { SecurityService } from '../../services/security.service';

// How many holdings to show initially and per "Show more" click.
const HOLDINGS_PAGE_SIZE = 3;

type HoldingsState =
  | { status: 'loading' }
  | { status: 'success'; data: HoldingViewModel[]; hasMore: boolean }
  | { status: 'error'; error: string };

@Component({
  selector: 'page-invest',
  templateUrl: 'invest.page.html',
  styleUrls: ['invest.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    CardComponent,
    CurrencyPipe,
    IonContent,
    IonHeader,
    IonList,
    IonSpinner,
    IonTitle,
    IonToolbar,
    InstrumentComponent,
    OrderFormComponent,
  ],
})
export class InvestPage {
  private readonly holdingsService = inject(HoldingsService);
  private readonly securityService = inject(SecurityService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Tracks how many holdings are currently visible. Starts at one page (3).
  // WHY BehaviorSubject: we need to combine it with holdings$ reactively so the
  // template updates automatically when either the list or the count changes.
  private readonly visibleCount = new BehaviorSubject<number>(HOLDINGS_PAGE_SIZE);

  readonly holdingsState$: Observable<HoldingsState> = this.visibleCount.pipe(
    // WHY switchMap: when the user clicks "Show more", the old inner observable is cancelled
    // and a new one starts with the updated limit. With a real paginated API this also
    // cancels any in-flight GET so a slow page-1 response can never overwrite page-2 data.
    switchMap((limit) =>
      this.holdingsService.getHoldingsPage(limit).pipe(
        map(({ data, hasMore }) => ({ status: 'success' as const, data, hasMore })),
        // startWith covers the loading window on initial load and each "Show more" click.
        startWith({ status: 'loading' as const }),
        catchError((err: unknown) =>
          of({ status: 'error' as const, error: err instanceof Error ? err.message : 'Failed to load holdings.' }),
        ),
      ),
    ),
  );

  readonly totalPortfolioValue$: Observable<number> =
    this.holdingsService.holdings$.pipe(
      map((holdings) => holdings.reduce((sum, h) => sum + h.totalValue, 0)),
    );

  readonly trendingState$: Observable<AsyncState<SecurityViewModel[]>> =
    this.securityService.getTopByVolume(10).pipe(
      map((data) => ({ status: 'success' as const, data })),
      startWith({ status: 'loading' as const }),
      catchError((err: unknown) =>
        of({ status: 'error' as const, error: err instanceof Error ? err.message : 'Failed to load trending.' }),
      ),
    );

  selectedSecurity: SecurityViewModel | null = null;

  trackBySymbol(_index: number, security: SecurityViewModel): string {
    return security.symbol;
  }

  /** Reveal the next page of holdings. Each click adds HOLDINGS_PAGE_SIZE more rows. */
  handleShowMore(): void {
    this.visibleCount.next(this.visibleCount.getValue() + HOLDINGS_PAGE_SIZE);
  }

  handleBuyClick(security: SecurityViewModel): void {
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
