// order-form.animations.ts — Angular animation triggers for OrderFormComponent.
// Only sheet slide and backdrop fade remain; chevron drag is now handled
// via Pointer Events + CSS transform directly in the component.

import { animate, style, transition, trigger } from '@angular/animations';

/**
 * The bottom sheet slides up from the bottom edge on :enter,
 * and slides back down on :leave.
 * cubic-bezier(0.4, 0, 0.2, 1) is the Material "standard" easing — feels native.
 */
export const sheetSlideAnimation = trigger('sheetSlide', [
  transition(':enter', [
    style({ transform: 'translateY(100%)' }), // start off-screen below
    animate('350ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateY(0)' })),
  ]),
  transition(':leave', [
    animate('280ms ease-in', style({ transform: 'translateY(100%)' })),
  ]),
]);

/**
 * Semi-transparent backdrop fades in behind the sheet on :enter,
 * and fades out on :leave.
 */
export const backdropFadeAnimation = trigger('backdropFade', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('300ms ease', style({ opacity: 1 })),
  ]),
  transition(':leave', [
    animate('250ms ease', style({ opacity: 0 })),
  ]),
]);
