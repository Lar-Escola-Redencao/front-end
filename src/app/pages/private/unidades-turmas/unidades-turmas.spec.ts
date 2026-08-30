import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnidadesTurmas } from './unidades-turmas';

describe('UnidadesTurmas', () => {
  let component: UnidadesTurmas;
  let fixture: ComponentFixture<UnidadesTurmas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnidadesTurmas],
    }).compileComponents();

    fixture = TestBed.createComponent(UnidadesTurmas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
