import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { of } from 'rxjs';
import { TransparenciaService } from './transparencia.service';

import { Transparencia } from './transparencia';

describe('Transparencia', () => {
  let component: Transparencia;
  let fixture: ComponentFixture<Transparencia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Transparencia],
      providers: [
        provideRouter([]),
        provideToastr(),
        { provide: TransparenciaService, useValue: {
          listarSecoesAdmin: () => of({ content: [], page: { size: 10, number: 0, totalElements: 0, totalPages: 0 } }),
          listarDocumentosAdmin: () => of({ content: [], page: { size: 10, number: 0, totalElements: 0, totalPages: 0 } })
        } }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Transparencia);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
