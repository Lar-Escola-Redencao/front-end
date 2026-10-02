import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { SecoesGrupoService } from './secoes-grupo.service';

describe('SecoesGrupoService', () => {
  let service: SecoesGrupoService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/paginas`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(SecoesGrupoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists only the sections of the requested grupo', () => {
    let resultado: any[] = [];
    service.listarPorGrupo(3, 'produtos').subscribe((secoes) => (resultado = secoes));

    const req = httpMock.expectOne(`${base}/3/secoes`);
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: 1,
        grupo: 'telefone',
        titulo: '11999998888',
        conteudo: null,
        imagem: null,
        ativo: true,
      },
      {
        id: 2,
        grupo: 'produtos',
        titulo: 'Caneca',
        conteudo: null,
        imagem: '/uploads/caneca.png',
        ativo: true,
      },
    ]);

    expect(resultado).toEqual([
      { id: 2, grupo: 'produtos', titulo: 'Caneca', conteudo: null, imagem: '/uploads/caneca.png' },
    ]);
  });

  it('creates with multipart sending only the given fields and no manual Content-Type', () => {
    service.criar(3, { grupo: 'telefone', titulo: '11999998888', conteudo: '' }).subscribe();

    const req = httpMock.expectOne(`${base}/3/secoes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.has('Content-Type')).toBe(false);

    const corpo = req.request.body as FormData;
    expect(corpo.get('titulo')).toBe('11999998888');
    expect(corpo.get('conteudo')).toBe('');
    expect(corpo.get('grupo')).toBe('telefone');
    expect(corpo.has('imagem')).toBe(false);
    req.flush({ id: 1, grupo: 'telefone', titulo: '11999998888' });
  });

  it('updates through PUT on the section id, sending the file in the imagem part', () => {
    const arquivo = new File(['qr'], 'qr.png', { type: 'image/png' });
    service
      .atualizar(4, 5, { grupo: 'pix', conteudo: 'chave@lar.org', imagem: arquivo })
      .subscribe();

    const req = httpMock.expectOne(`${base}/4/secoes/5`);
    expect(req.request.method).toBe('PUT');

    const corpo = req.request.body as FormData;
    expect(corpo.has('titulo')).toBe(false);
    expect(corpo.get('conteudo')).toBe('chave@lar.org');
    expect(corpo.get('grupo')).toBe('pix');
    expect(corpo.get('imagem')).toBeInstanceOf(File);
    req.flush({ id: 5, grupo: 'pix', conteudo: 'chave@lar.org', imagem: '/uploads/qr.png' });
  });

  it('deletes by section id, on the route without the page id', () => {
    service.excluir(7).subscribe();

    const req = httpMock.expectOne(`${base}/secoes/7`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
