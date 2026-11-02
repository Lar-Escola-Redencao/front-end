import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { of } from 'rxjs';
import { EventoService } from 'src/app/shared/services/content-management/evento/evento.service';
import { ParceiroService } from 'src/app/shared/services/content-management/evento/parceiro.service';

import { ContentManagement } from './content-management';

describe('ContentManagement', () => {
  let component: ContentManagement;
  let fixture: ComponentFixture<ContentManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentManagement],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideToastr(),
        { provide: EventoService, useValue: {
          listarTodos: () => of({ content: [], page: { size: 10, number: 0, totalElements: 0, totalPages: 0 } })
        } },
        { provide: ParceiroService, useValue: { listarTodos: () => of([]) } }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContentManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
