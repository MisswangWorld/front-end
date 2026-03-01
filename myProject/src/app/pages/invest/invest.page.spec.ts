import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY } from 'rxjs';

import { HoldingsService } from '../services/holdings.service';
import { InvestPage } from './invest.page';

const holdingsServiceMock = {
  holdings$: EMPTY,
  addHolding: jasmine.createSpy('addHolding'),
};

describe('InvestPage', () => {
  let component: InvestPage;
  let fixture: ComponentFixture<InvestPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvestPage],
      providers: [{ provide: HoldingsService, useValue: holdingsServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
