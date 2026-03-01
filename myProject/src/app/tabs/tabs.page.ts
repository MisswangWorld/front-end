// tabs.page.ts — persistent tab shell component.
// Renders the bottom tab bar and the <ion-tabs> outlet that swaps page content.
// Icons are registered here once so child pages don't need to re-register them.

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { briefcaseOutline, searchOutline } from 'ionicons/icons';

/**
 * Tab shell for the two main pages: Invest and Discover.
 * Stays mounted for the lifetime of the session; only the inner page is swapped.
 */
@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  constructor() {
    // WHY here: addIcons must run before the template renders the icons.
    // Registering in the shell guarantees both tab icons are available immediately.
    addIcons({ briefcaseOutline, searchOutline });
  }
}
