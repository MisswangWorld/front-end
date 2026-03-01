import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvestPage } from './invest.page';

describe('InvestPage', () => {
  let component: InvestPage;
  let fixture: ComponentFixture<InvestPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(InvestPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
