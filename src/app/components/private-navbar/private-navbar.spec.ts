import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrivateNavbar } from './private-navbar';

describe('PrivateNavbar', () => {
  let component: PrivateNavbar;
  let fixture: ComponentFixture<PrivateNavbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivateNavbar],
    }).compileComponents();

    fixture = TestBed.createComponent(PrivateNavbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
