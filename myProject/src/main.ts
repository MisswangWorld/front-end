import { bootstrapApplication } from '@angular/platform-browser';
// provideAnimations() is deprecated in Angular 20.2 (intent to remove v23),
// but the old trigger/transition API still requires it. Migrate to animate.enter/leave before v23.
// eslint-disable-next-line @typescript-eslint/no-deprecated
import { provideAnimations } from '@angular/platform-browser/animations';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideAnimations(),
  ],
});
