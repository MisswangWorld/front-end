// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // Dev: HttpClient fetches local JSON files served by the Angular asset server.
  // Switching to a real backend = update apiBaseUrl (and endpoint paths in services) in environment.prod.ts.
  apiBaseUrl: '/assets/data',
};
