// http-error.util.ts — converts an HttpErrorResponse into a user-readable string.
// Used by services so that every catchError in the app speaks the same language.

import { HttpErrorResponse } from '@angular/common/http';

/**
 * Maps an HttpErrorResponse to a short, user-facing error message.
 *
 * WHY here and not in each service: centralising this keeps the per-service
 * catchError blocks tiny (one line each) and ensures consistent wording across
 * every endpoint the app ever calls.
 */
export function toHttpErrorMessage(err: HttpErrorResponse): string {
  // status 0 means the request never reached the server:
  // no network, CORS blocked, or the dev server isn't running.
  if (err.status === 0) return 'Network error. Please check your connection.';
  if (err.status === 401) return 'Session expired. Please log in again.';
  if (err.status === 403) return 'Access denied.';
  if (err.status === 404) return 'Resource not found.';
  if (err.status === 429) return 'Too many requests. Please try again shortly.';
  if (err.status >= 500) return 'Server error. Please try again later.';
  return `Unexpected error (${err.status}).`;
}
