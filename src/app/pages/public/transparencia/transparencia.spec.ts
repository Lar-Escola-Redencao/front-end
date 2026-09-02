import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from 'src/environments/environment';
import { Secao } from 'src/app/shared/models/transparencia.model';
import { Transparencia } from './transparencia';

describe('Transparencia', () => {
  let fixture: ComponentFixture<Transparencia>;
  let httpMock: HttpTestingController;

  const secoesMock: Secao[] = [
    {
      id: 1,
      titulo: 'Estatuto Social e Atas',
      conteudo: 'Documentos institucionais da organização.',
      ativo: true,
      documentos: [{ id: 10, titulo: 'Ata de Assembleia 2025', arquivo: '/uploads/transparencia/documentos/ata.pdf' }],
    },
    {
      id: 2,
      titulo: 'Relatórios Financeiros',
      ativo: true,
      documentos: [],
    },
  ];

  function setup(): void {
    TestBed.configureTestingModule({
      imports: [Transparencia],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    fixture = TestBed.createComponent(Transparencia);
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('shows a loading indicator while the request is in flight', () => {
    setup();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.spinner')).not.toBeNull();

    httpMock.expectOne(`${environment.apiUrl}/transparencia/secoes`).flush(secoesMock);
  });

  it('renders sections grouped with their documents once loaded', () => {
    setup();
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/transparencia/secoes`).flush(secoesMock);
    fixture.detectChanges();

    const titles = Array.from(fixture.nativeElement.querySelectorAll('.secao h2')).map(
      (el) => (el as HTMLElement).textContent,
    );
    expect(titles).toEqual(['Estatuto Social e Atas', 'Relatórios Financeiros']);
    expect(fixture.nativeElement.textContent).toContain('Ata de Assembleia 2025');
  });

  it('shows an empty state for a section without published documents', () => {
    setup();
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/transparencia/secoes`).flush(secoesMock);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nenhum documento publicado nesta categoria ainda.');
  });

  it('shows an error message with a retry action when the request fails', () => {
    setup();
    fixture.detectChanges();

    httpMock
      .expectOne(`${environment.apiUrl}/transparencia/secoes`)
      .flush('erro', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar os documentos');

    (fixture.nativeElement.querySelector('.btn-retry') as HTMLButtonElement).click();
    httpMock.expectOne(`${environment.apiUrl}/transparencia/secoes`).flush(secoesMock);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.state-error')).toBeNull();
  });
});
