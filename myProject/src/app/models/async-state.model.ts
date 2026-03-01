// async-state.model.ts — shared discriminated union for async stream states.
// Used by page components to model loading / success / error without repeating the type inline.

/** Generic discriminated union for any async data stream. */
export type AsyncState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'error'; readonly error: string };
