import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { ColaboradorComponent } from './colaborador.component';

describe('ColaboradorComponent', () => {
  let component: ColaboradorComponent;
  let fixture: ComponentFixture<ColaboradorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColaboradorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideToastr()]
    }).compileComponents();

    fixture = TestBed.createComponent(ColaboradorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).match(() => true).forEach(request => {
      if (request.request.url.endsWith('/papel/todos')) {
        request.flush([{ id: 1, nome: 'ADMINISTRADOR' }, { id: 2, nome: 'COORDENADOR' }, { id: 3, nome: 'MONITOR' }]);
      } else {
        request.flush({ content: [], page: { totalElements: 0, totalPages: 0, number: 0, size: 10 } });
      }
    });
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('oculta unidades e permite administrador sem vínculos manuais', () => {
    component.abrirCadastro();
    component.formColaborador.get('idPapel')!.setValue(1);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.unidades-box')).toBeNull();
    expect(component.formColaborador.get('idsUnidades')!.disabled).toBe(true);
    expect(component.formColaborador.value.idsUnidades).toBeUndefined();
  });

  it('volta a exigir unidades ao trocar administrador por coordenador ou monitor', () => {
    component.abrirCadastro();
    for (const idPapel of [2, 3]) {
      component.formColaborador.get('idPapel')!.setValue(1);
      component.formColaborador.get('idPapel')!.setValue(idPapel);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.unidades-box')).not.toBeNull();
      expect(component.formColaborador.get('idsUnidades')!.hasError('required')).toBe(true);
    }
  });
});
