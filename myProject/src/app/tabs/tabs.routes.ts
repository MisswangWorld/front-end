import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'invest',
        loadComponent: () =>
          import('../pages/invest/invest.page').then((m) => m.InvestPage),
      },
      {
        path: 'discover',
        loadComponent: () =>
          import('../pages/discover/discover.page').then((m) => m.DiscoverPage),
      },
      {
        path: '',
        redirectTo: '/tabs/invest',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/invest',
    pathMatch: 'full',
  },
];
