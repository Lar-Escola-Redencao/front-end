import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';

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
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ToastrService, useValue: { error: vi.fn(), warning: vi.fn() } },
        { provide: PublicContentService, useValue: { getRedesSociaisAtivas: () => of([]) } },
      ],
    });

    fixture = TestBed.createComponent(Transparencia);
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    httpMock?.verify();
    fixture?.destroy();
    TestBed.resetTestingModule();
  });

  it('respeita a ordem salva, desempata por ID e preserva as regras de visibilidade', () => {
    setup(); fixture.detectChanges();
    const documento = secoesMock[0].documentos;
    httpMock.expectOne(`${environment.apiUrl}/paginas/1/secoes`).flush([
      { id: 8, titulo: 'Última', ordem: 3, ativo: true, documentos: documento },
      { id: 5, titulo: 'Desempate', ordem: 1, ativo: true, documentos: documento },
      { id: 2, titulo: 'Primeira', ordem: 1, ativo: true, documentos: documento },
      { id: 3, titulo: 'Oculta', ordem: 2, ativo: false, documentos: documento },
      { id: 4, titulo: 'Vazia', ordem: 2, ativo: true, documentos: [] },
    ]);
    fixture.detectChanges();
    expect(Array.from(fixture.nativeElement.querySelectorAll('.secao-titulo'))
      .map(el => (el as HTMLElement).textContent)).toEqual(['Primeira', 'Desempate', 'Última']);
  });

  it('shows a loading indicator while the request is in flight', () => {
    setup();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.spinner')).not.toBeNull();

    httpMock.expectOne(`${environment.apiUrl}/paginas/1/secoes`).flush(secoesMock);
  });

  it('renders only sections with documents and keeps them closed once loaded', () => {
    setup();
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/paginas/1/secoes`).flush(secoesMock);
    fixture.detectChanges();

    const titles = Array.from(fixture.nativeElement.querySelectorAll('.secao-titulo')).map(
      (el) => (el as HTMLElement).textContent,
    );
    expect(titles).toEqual(['Estatuto Social e Atas']);
    expect(fixture.nativeElement.textContent).not.toContain('Ata de Assembleia 2025');
  });

  it('opens a section when clicking its chevron button', () => {
    setup();
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/paginas/1/secoes`).flush(secoesMock);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.secao-cabecalho') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ata de Assembleia 2025');
    expect(fixture.nativeElement.querySelector('.documento-icone')?.textContent).toContain('description');
  });

  it('shows an error message with a retry action when the request fails', () => {
    setup();
    fixture.detectChanges();

    httpMock
      .expectOne(`${environment.apiUrl}/paginas/1/secoes`)
      .flush('erro', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar os documentos');

    (fixture.nativeElement.querySelector('.btn-retry') as HTMLButtonElement).click();
    httpMock.expectOne(`${environment.apiUrl}/paginas/1/secoes`).flush(secoesMock);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.state-error')).toBeNull();
  });
});
