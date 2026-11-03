import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';

import { PublicFooter } from './public-footer';

describe('PublicFooter', () => {
  let component: PublicFooter;
  let fixture: ComponentFixture<PublicFooter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicFooter],
      providers: [provideRouter([]), { provide: PublicContentService, useValue: { getRedesSociaisAtivas: () => of([]) } }],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicFooter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
