// app.component.ts — root component. Hosts the router outlet; all real UI lives in tab pages.

import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

/** Application shell. Renders the Ionic router outlet that mounts tab routes. */
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {}
