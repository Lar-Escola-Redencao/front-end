import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { MembroComponent } from './membro.component';

describe('MembroComponent', () => {
  let component: MembroComponent;
  let fixture: ComponentFixture<MembroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembroComponent],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(MembroComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
