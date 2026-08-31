import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalLayout } from './modal-layout';

describe('ModalLayout', () => {
  let component: ModalLayout;
  let fixture: ComponentFixture<ModalLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalLayout],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
