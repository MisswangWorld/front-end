// DiscoverPage — smart (container) component for the "Discover" tab.
// Displays all securities with search; will consume SecurityService once the data layer is built.
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'page-discover',
  templateUrl: 'discover.page.html',
  styleUrls: ['discover.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar],
})
export class DiscoverPage {}
