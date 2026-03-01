// tabs.routes.ts — child route configuration for the tab shell.
// Each tab page is lazy-loaded (loadComponent) so its JS bundle is only fetched
// when the user navigates to that tab for the first time.

import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage, // shell is eager — it's always visible
    children: [
      {
        path: 'invest',
        // WHY loadComponent: defers InvestPage + HoldingsService bundle until first visit.
        loadComponent: () =>
          import('../pages/invest/invest.page').then((m) => m.InvestPage),
      },
      {
        path: 'discover',
        loadComponent: () =>
          import('../pages/discover/discover.page').then((m) => m.DiscoverPage),
      },
      {
        // Empty child path → redirect to Invest so the app always opens on a named tab.
        path: '',
        redirectTo: '/tabs/invest',
        pathMatch: 'full',
      },
    ],
  },
  {
    // Root redirect for direct navigation to '/' (e.g. hard refresh or deep link root).
    path: '',
    redirectTo: '/tabs/invest',
    pathMatch: 'full',
  },
];
