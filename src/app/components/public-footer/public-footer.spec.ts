import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicFooter } from './public-footer';

describe('PublicFooter', () => {
  let component: PublicFooter;
  let fixture: ComponentFixture<PublicFooter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicFooter],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicFooter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
