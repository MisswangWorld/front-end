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
import { Observable, catchError, map, of, startWith } from 'rxjs';

import { CardComponent } from '../components/card/card.component';
import { InstrumentComponent } from '../components/instrument/instrument.component';
import {
  BuyConfirmedPayload,
  OrderFormComponent,
} from '../components/order-form/order-form.component';
import { HoldingViewModel } from '../models/holding-view.model';
import { SecurityViewModel } from '../models/security-view.model';
import { HoldingsService } from '../services/holdings.service';
import { SecurityService } from '../services/security.service';

type HoldingsState =
  | { status: 'loading' }
  | { status: 'success'; data: HoldingViewModel[] }
  | { status: 'error'; error: string };

type TrendingState =
  | { status: 'loading' }
  | { status: 'success'; data: SecurityViewModel[] }
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

  readonly holdingsState$: Observable<HoldingsState> =
    this.holdingsService.holdings$.pipe(
      map((data) => ({ status: 'success' as const, data })),
      startWith({ status: 'loading' as const }),
      catchError(() =>
        of({ status: 'error' as const, error: 'Failed to load holdings.' }),
      ),
    );

  readonly totalPortfolioValue$: Observable<number> =
    this.holdingsService.holdings$.pipe(
      map((holdings) => holdings.reduce((sum, h) => sum + h.totalValue, 0)),
    );

  readonly trendingState$: Observable<TrendingState> =
    this.securityService.getTopByVolume(10).pipe(
      map((data) => ({ status: 'success' as const, data })),
      startWith({ status: 'loading' as const }),
      catchError(() =>
        of({ status: 'error' as const, error: 'Failed to load trending.' }),
      ),
    );

  selectedSecurity: SecurityViewModel | null = null;

  trackBySymbol(_index: number, security: SecurityViewModel): string {
    return security.symbol;
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
