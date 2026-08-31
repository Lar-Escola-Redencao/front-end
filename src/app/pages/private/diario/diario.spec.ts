import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Diario } from './diario';

describe('Diario', () => {
  let component: Diario;
  let fixture: ComponentFixture<Diario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Diario],
    }).compileComponents();

    fixture = TestBed.createComponent(Diario);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
