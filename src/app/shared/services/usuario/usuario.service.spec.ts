import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsuarioService } from './usuario.service';
import { CadastroUsuarioCompletoDTO } from '../../models/usuario.model';
import { environment } from 'src/environments/environment';

describe('Cadastro de usuário com anexos', () => {
  let service: UsuarioService;
  let http: HttpTestingController;
  const dto: CadastroUsuarioCompletoDTO = { nomeCompleto: 'Maria', dataNascimento: '2015-01-01', endereco: 'Rua A', bairro: 'Centro', escola: 'Escola', periodoEscolar: 'MANHA', serieEscolar: 'PRIMEIRO_ANO', idTurma: 2, contatos: [], composicaoFamiliar: [], fichaSocioeconomica: { tipoMoradia: 'PROPRIA' } };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(UsuarioService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('envia JSON sem anexos', () => {
    service.criar(dto).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/usuarios`);
    expect(req.request.body).toBe(dto);
    req.flush({ id: 1 });
  });
  it('envia dados como Blob JSON e partes repetidas, sem fixar Content-Type', () => {
    const arquivos = [new File(['a'], 'a.pdf'), new File(['b'], 'b.png')];
    service.criar(dto, arquivos).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/usuarios`);
    const body = req.request.body as FormData;
    expect(body.get('dados')).toBeInstanceOf(Blob);
    expect((body.get('dados') as Blob).type).toBe('application/json');
    expect(body.getAll('arquivosSaude')).toHaveLength(2);
    expect(req.request.headers.has('Content-Type')).toBe(false);
    req.flush({ id: 1 });
  });
});
