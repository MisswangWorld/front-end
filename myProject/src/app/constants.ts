// constants.ts — app-wide compile-time constants shared across services.
// Only true constants belong here — values that never change at runtime.

// Simulated network delay used by all mock API calls (of(data).pipe(delay(...)))
// Change this one value to adjust the feel of all mock responses simultaneously.
export const SIMULATED_DELAY_MS = 300;
