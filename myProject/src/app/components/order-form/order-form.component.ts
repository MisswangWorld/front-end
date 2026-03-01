// order-form.component.ts — bottom-sheet BUY form with swipe-to-confirm gesture.
// Smart about pointer events: supports both touch and mouse via the Pointer Events API.

import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';

import { SecurityViewModel } from '../../models/security-view.model';
import { backdropFadeAnimation, sheetSlideAnimation } from './order-form.animations';

/** Emitted after the simulated POST resolves. Parent passes to HoldingsService. */
export type BuyConfirmedPayload = {
  readonly symbol: string;
  readonly shares: number;
  readonly amount: number;
};

type FormStatus = 'form' | 'submitting';

// How far (px) the chevron must travel before a release counts as a confirmed swipe.
// WHY 75%: feels intentional without being frustrating on small screens.
const SWIPE_THRESHOLD_RATIO = 0.75;

// The button is full-width minus padding; the chevron circle is 48px + 4px inset.
// We compute maxDrag dynamically from the button element's width at drag start.
const CHEVRON_DIAMETER_PX = 48;
const CHEVRON_INSET_PX = 4;

/**
 * Bottom-sheet order form.
 *
 * Animation sequence:
 *  1. Sheet slides up   (security input becomes non-null)
 *  2. User fills Amount  → Shares auto-computed
 *  3. User presses and drags the ">>" chevron across the button
 *  4. Release past threshold → formStatus = 'submitting' (button goes all-black)
 *  5. Simulate POST /orders (1 s) → emit buyConfirmed → dismiss
 *  6. Sheet slides back down (security set to null by parent)
 *  Release before threshold → chevron snaps back to start.
 */
@Component({
  selector: 'app-order-form',
  templateUrl: 'order-form.component.html',
  styleUrls: ['order-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // WHY: sheetSlide / backdropFade still use Angular trigger-based animations for enter/leave.
  // The chevron drag is now handled with pointer events + CSS transform directly.
  animations: [sheetSlideAnimation, backdropFadeAnimation],
  imports: [CurrencyPipe],
})
export class OrderFormComponent implements OnChanges {
  /** Non-null → sheet open. Parent sets to null to close. */
  @Input() security: SecurityViewModel | null = null;

  /** Emitted after simulated POST resolves. Parent calls HoldingsService. */
  @Output() readonly buyConfirmed = new EventEmitter<BuyConfirmedPayload>();

  /** Emitted when the sheet should close. Parent sets security = null. */
  @Output() readonly dismissed = new EventEmitter<void>();

  formStatus: FormStatus = 'form';
  amount = '';

  // ── Drag state ──────────────────────────────────────────────────────────────
  /** Current translateX of the chevron circle in px. Bound to [style.transform]. */
  dragX = 0;

  /** True while the user is actively dragging. Used to disable CSS transition during drag. */
  isDragging = false;

  /** X position of the pointer at drag start (clientX). */
  private dragStartX = 0;

  /** Maximum px the chevron can travel (button width minus chevron width minus inset). */
  private maxDragX = 0;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  // Reset form whenever a new security is passed in (sheet re-opens)
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['security'] && changes['security'].currentValue !== null) {
      this.formStatus = 'form';
      this.amount = '';
      this.dragX = 0;
      this.isDragging = false;
    }
  }

  get isAmountValid(): boolean {
    const parsed = parseFloat(this.amount);
    return !isNaN(parsed) && parsed > 0;
  }

  /** Shares = amount ÷ ask price, shown in the read-only Shares field. */
  get computedShares(): string {
    if (!this.security || !this.isAmountValid) return '0.0000';
    return (parseFloat(this.amount) / this.security.ask).toFixed(4);
  }

  handleAmountInput(event: Event): void {
    this.amount = (event.target as HTMLInputElement).value;
    // WHY: OnPush won't pick up DOM events automatically — markForCheck() forces a re-check.
    this.cdr.markForCheck();
  }

  // ── Pointer event handlers ─────────────────────────────────────────────────

  /**
   * Called when the user presses down on the chevron circle.
   * setPointerCapture() ensures pointermove/pointerup fire on this element
   * even if the pointer moves outside of it (essential for fast drags).
   */
  handlePointerDown(event: PointerEvent): void {
    if (!this.isAmountValid || this.formStatus === 'submitting') return;

    const button = (event.currentTarget as HTMLElement).closest('.swipe-btn') as HTMLElement;
    if (!button) return;

    // Compute the usable drag range from the button's current rendered width.
    this.maxDragX = button.offsetWidth - CHEVRON_DIAMETER_PX - CHEVRON_INSET_PX * 2;
    this.dragStartX = event.clientX;
    this.isDragging = true;

    // Lock all future pointer events to this element until pointerup.
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

    this.cdr.markForCheck();
  }

  /** Called on every pointer move. Updates dragX clamped to [0, maxDragX]. */
  handlePointerMove(event: PointerEvent): void {
    if (!this.isDragging) return;

    const delta = event.clientX - this.dragStartX;
    // clamp: don't let the chevron go left of start or beyond the button edge.
    this.dragX = Math.max(0, Math.min(delta, this.maxDragX));

    this.cdr.markForCheck();
  }

  /**
   * Called when the pointer is released.
   * If dragX has passed the threshold → confirm buy.
   * Otherwise → snap the chevron back to start (CSS transition handles the animation).
   */
  handlePointerUp(): void {
    if (!this.isDragging) return;

    this.isDragging = false;
    const threshold = this.maxDragX * SWIPE_THRESHOLD_RATIO;

    if (this.dragX >= threshold) {
      this.confirmBuy();
    } else {
      // Snap back — CSS transition on the chevron animates this smoothly.
      this.dragX = 0;
    }

    this.cdr.markForCheck();
  }

  /** Transition to submitting state and simulate the POST /orders call. */
  private confirmBuy(): void {
    // Move chevron to the end so the button goes all-black cleanly.
    this.dragX = this.maxDragX;
    this.formStatus = 'submitting';
    this.cdr.markForCheck();

    // WHY setTimeout: simulates a real async POST. 1 s gives the user visual feedback.
    setTimeout(() => {
      this.buyConfirmed.emit({
        symbol: this.security!.symbol,
        shares: parseFloat(this.computedShares),
        amount: parseFloat(this.amount),
      });
      this.handleDismiss();
    }, 1000);
  }

  handleDismiss(): void {
    this.dismissed.emit();
    // Reset after leave animation completes so the form is clean next time it opens.
    setTimeout(() => {
      this.formStatus = 'form';
      this.amount = '';
      this.dragX = 0;
      this.cdr.markForCheck();
    }, 400);
  }

}
