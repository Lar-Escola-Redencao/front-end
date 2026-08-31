import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabelaLayout } from './tabela-layout';

describe('TabelaLayout', () => {
  let component: TabelaLayout;
  let fixture: ComponentFixture<TabelaLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabelaLayout],
    }).compileComponents();

    fixture = TestBed.createComponent(TabelaLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
