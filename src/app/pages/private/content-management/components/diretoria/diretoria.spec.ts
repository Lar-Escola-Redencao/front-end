import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Diretoria } from './diretoria';

describe('Diretoria', () => {
  let component: Diretoria;
  let fixture: ComponentFixture<Diretoria>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Diretoria],
    }).compileComponents();

    fixture = TestBed.createComponent(Diretoria);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
