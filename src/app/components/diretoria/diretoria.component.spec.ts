import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { DiretoriaComponent } from './diretoria.component';

describe('DiretoriaComponent', () => {
  let component: DiretoriaComponent;
  let fixture: ComponentFixture<DiretoriaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiretoriaComponent],
      providers: [provideHttpClient(), provideAnimations(), provideToastr()]
    }).compileComponents();

    fixture = TestBed.createComponent(DiretoriaComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
