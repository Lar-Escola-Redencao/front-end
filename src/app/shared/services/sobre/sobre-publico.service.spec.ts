import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SobrePublicoService, ConteudoSobre } from './sobre-publico.service';
import { environment } from 'src/environments/environment';

describe('SobrePublicoService', () => {
  let service: SobrePublicoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SobrePublicoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('busca as seções públicas, filtra inativas, ordena e resolve as imagens', () => {
    let resultado!: ConteudoSobre;
    service.obterConteudo().subscribe((conteudo) => {
      resultado = conteudo;
    });
    const request = http.expectOne(`${environment.apiUrl}/paginas/2`);
    expect(request.request.method).toBe('GET');
    request.flush({
      id: 2,
      nome: 'Sobre',
      ativo: true,
      secoes: [
        {
          id: 3,
          titulo: '1995',
          grupo: 'historia',
          ordem: 2,
          ativo: true,
          imagem: '/uploads/paginas/historia.jpg',
        },
        { id: 2, titulo: '1978', grupo: 'historia', ordem: 1, ativo: true },
        { id: 1, titulo: 'Sobre', grupo: 'texto-sobre', ativo: true, conteudo: 'Missão e valores' },
        { id: 4, grupo: 'texto-sobre', ativo: false, conteudo: 'Não publicar' },
        {
          id: 5,
          grupo: 'carrossel',
          ordem: 1,
          ativo: true,
          imagem: 'https://example.com/foto.jpg',
        },
        { id: 6, grupo: 'carrossel', ordem: 2, ativo: true },
      ],
    });
    expect(resultado.texto.map((secao) => secao.id)).toEqual([1]);
    expect(resultado.historia.map((secao) => secao.id)).toEqual([2, 3]);
    expect(resultado.historia[1].imagem).toBe(`${environment.apiUrl}/uploads/paginas/historia.jpg`);
    expect(resultado.carrossel.map((secao) => secao.id)).toEqual([5]);
    expect(resultado.carrossel[0].imagem).toBe('https://example.com/foto.jpg');
  });

  it('propaga o erro HTTP para a tela apresentar a nova tentativa', () => {
    let status: number | undefined;
    service.obterConteudo().subscribe({
      error: (erro) => {
        status = erro.status;
      },
    });
    http
      .expectOne(`${environment.apiUrl}/paginas/2`)
      .flush({}, { status: 503, statusText: 'Service Unavailable' });
    expect(status).toBe(503);
  });

  it('limita o carrossel às oito fotos ativas na ordem cadastrada', () => {
    let resultado!: ConteudoSobre;
    service.obterConteudo().subscribe((conteudo) => {
      resultado = conteudo;
    });
    const secoes = Array.from({ length: 12 }, (_, indice) => ({
      id: indice + 1,
      grupo: 'carrossel',
      ordem: 12 - indice,
      ativo: true,
      imagem: `/uploads/paginas/foto-${indice}.jpg`,
    }));
    http.expectOne(`${environment.apiUrl}/paginas/2`).flush({ secoes, ativo: true });
    expect(resultado.carrossel.length).toBe(8);
    expect(resultado.carrossel.map((foto) => foto.ordem)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('usa o total da paginação para contar todas as unidades', () => {
    let total: number | undefined;
    service.obterTotalUnidades().subscribe((valor) => {
      total = valor;
    });
    const request = http.expectOne(`${environment.apiUrl}/unidade/todas?size=1`);
    request.flush({
      content: [{ id: 1 }],
      page: { size: 1, number: 0, totalElements: 10, totalPages: 10 },
    });
    expect(total).toBe(10);
  });

  it('obtém somente os indicadores públicos e a data de fundação', () => {
    let resultado: unknown;
    service.obterIndicadores().subscribe((valor) => {
      resultado = valor;
    });
    http
      .expectOne(`${environment.apiUrl}/paginas/sobre/indicadores`)
      .flush({ totalMeninos: 97, dataFundacao: '1978-08-29' });
    expect(resultado).toEqual({ totalMeninos: 97, dataFundacao: '1978-08-29' });
  });
});
