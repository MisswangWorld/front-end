// InvestPage — smart (container) component for the "Invest" tab.
// Displays the user's holdings; will consume HoldingsService once the data layer is built.
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'page-invest',
  templateUrl: 'invest.page.html',
  styleUrls: ['invest.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar],
})
export class InvestPage {}
