// app.routes.ts — root route configuration.
// Delegates everything to tabs.routes via lazy loadChildren so the tab module
// is only downloaded when the app first loads (standard Ionic shell pattern).

import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    // WHY loadChildren (not loadComponent): the tab shell owns multiple child routes.
    // Lazy-loading the whole child module keeps the initial bundle small.
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
];
