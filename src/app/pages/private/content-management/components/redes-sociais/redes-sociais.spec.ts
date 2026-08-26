import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RedesSociais } from './redes-sociais';

describe('RedesSociais', () => {
  let component: RedesSociais;
  let fixture: ComponentFixture<RedesSociais>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RedesSociais],
    }).compileComponents();

    fixture = TestBed.createComponent(RedesSociais);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
