import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import Swal, { SweetAlertResult } from 'sweetalert2';
import { vi } from 'vitest';
import { Alertas } from 'src/app/shared/utils/alerts';
import { TransparenciaService } from './transparencia.service';
import { Transparencia } from './transparencia';

const pagina = (content: any[] = [], number = 0, totalPages = content.length ? 1 : 0) =>
  ({ content, page: { size: 50, number, totalElements: content.length, totalPages } });
const secao = { id: 3, titulo: 'Atas', ativo: true };

describe('Transparência administrativa', () => {
  let fixture: ComponentFixture<Transparencia>;
  let component: Transparencia;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let toast: Record<string, ReturnType<typeof vi.fn>>;
  let navegar: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    params = new BehaviorSubject(convertToParamMap({}));
    api = {
      listarSecoesAdmin: vi.fn(() => of(pagina())),
      listarDocumentosAdmin: vi.fn(() => of(pagina())),
      deletarSecao: vi.fn(() => of(undefined)),
      criarSecao: vi.fn(() => of(secao)),
    };
    toast = { error: vi.fn(), warning: vi.fn(), info: vi.fn(), success: vi.fn() };
    TestBed.configureTestingModule({ imports: [Transparencia], providers: [provideRouter([]),
      { provide: ActivatedRoute, useValue: { queryParamMap: params.asObservable() } },
      { provide: TransparenciaService, useValue: api }, { provide: ToastrService, useValue: toast },
    ] });
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: false } as SweetAlertResult);
    vi.spyOn(Alertas, 'confirmarExclusao').mockResolvedValue(true);
  });
  afterEach(() => { fixture?.destroy(); vi.restoreAllMocks(); TestBed.resetTestingModule(); });

  function criar() {
    fixture = TestBed.createComponent(Transparencia); component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('oferece cadastrar seção sem abrir o documento, e permite deixar para depois', async () => {
    criar(); await component.abrirModal('documento');
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ confirmButtonText: 'Cadastrar seção', cancelButtonText: 'Depois' }));
    expect(component.modalAberto).toBeNull(); expect(navegar).not.toHaveBeenCalled();
  });

  it('abre o formulário de seção e muda para a aba correspondente ao confirmar', async () => {
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true } as SweetAlertResult);
    criar(); await component.abrirModal('documento');
    expect(navegar).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: expect.objectContaining({ aba: 'secoes', page: 0 }) }));
    expect(component.abaAtiva).toBe('secoes'); expect(component.modalAberto).toBe('secao');
    expect(component.modoEdicao).toBe(false);
  });

  it('abre documento normalmente quando já existe seção, inclusive inativa', async () => {
    api['listarSecoesAdmin'].mockReturnValue(of(pagina([{ ...secao, ativo: false }])));
    criar(); await component.abrirModal('documento');
    expect(component.modalAberto).toBe('documento'); expect(Swal.fire).not.toHaveBeenCalled();
  });

  it('não confunde carregamento ou falha de consulta com ausência de seções', async () => {
    const resposta = new Subject<any>(); api['listarSecoesAdmin'].mockReturnValue(resposta);
    criar(); await component.abrirModal('documento');
    expect(Swal.fire).not.toHaveBeenCalled(); expect(component.modalAberto).toBeNull();
    resposta.error(new Error('offline'));
    api['listarSecoesAdmin'].mockReturnValue(throwError(() => new Error('offline')));
    await component.abrirModal('documento');
    expect(Swal.fire).not.toHaveBeenCalled(); expect(toast['error']).toHaveBeenCalled();
  });

  it('carrega todas as seções quando existem mais que uma página de opções', () => {
    api['listarSecoesAdmin'].mockImplementation((numero: number) => of(pagina([{ ...secao, id: numero + 3 }], numero, 2)));
    criar(); expect(component.secoesParaSelecao.map(s => s.id)).toEqual([3, 4]);
  });

  it('bloqueia exclusão com documentos e avisa antes de pedir confirmação', async () => {
    criar(); component.abaAtiva = 'secoes';
    api['listarDocumentosAdmin'].mockReturnValue(of(pagina([{ id: 1 }])));
    await component.executarAcao({ tipo: 'excluir', linha: secao });
    expect(api['listarDocumentosAdmin']).toHaveBeenLastCalledWith(0, 1, undefined, undefined, 3);
    expect(api['deletarSecao']).not.toHaveBeenCalled(); expect(Alertas.confirmarExclusao).not.toHaveBeenCalled();
    expect(toast['warning']).toHaveBeenCalledWith(expect.stringContaining('documentos vinculados'), expect.any(String));
  });

  it('permite excluir seção vazia após a confirmação', async () => {
    criar(); component.abaAtiva = 'secoes';
    await component.executarAcao({ tipo: 'excluir', linha: secao });
    expect(api['deletarSecao']).toHaveBeenCalledWith(3);
  });

  it('não exclui se não for possível consultar os documentos vinculados', async () => {
    criar(); component.abaAtiva = 'secoes';
    api['listarDocumentosAdmin'].mockReturnValue(throwError(() => new Error('offline')));
    await component.executarAcao({ tipo: 'excluir', linha: secao });
    expect(api['deletarSecao']).not.toHaveBeenCalled(); expect(toast['error']).toHaveBeenCalled();
  });

  it('combina seção, busca, ordenação e paginação na consulta ao servidor', () => {
    params.next(convertToParamMap({ secao: '3', search: 'Ata', page: '2', sort: 'titulo,asc' }));
    api['listarSecoesAdmin'].mockReturnValue(of(pagina([secao])));
    criar(); expect(api['listarDocumentosAdmin']).toHaveBeenCalledWith(2, 10, 'titulo,asc', 'Ata', 3);
  });

  it('deixa de mostrar o aviso depois que a primeira seção é salva', async () => {
    criar(); await component.abrirModal('secao'); component.formSecao.patchValue({ titulo: 'Atas' });
    api['listarSecoesAdmin'].mockReturnValue(of(pagina([secao])));
    component.salvarSecao(); await component.abrirModal('documento');
    expect(component.modalAberto).toBe('documento'); expect(Swal.fire).not.toHaveBeenCalled();
  });

  it('reinicia na primeira página ao escolher uma seção, preservando os demais filtros', () => {
    api['listarSecoesAdmin'].mockReturnValue(of(pagina([secao])));
    criar(); component.filtrarPorSecao(3);
    expect(navegar).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { secao: 3, page: 0 }, queryParamsHandling: 'merge' }));
  });

  it('exibe a mensagem da API se novos documentos impedirem a exclusão após a consulta', async () => {
    criar(); component.abaAtiva = 'secoes';
    const mensagem = 'Exclua os documentos vinculados a esta seção antes de excluí-la.';
    api['deletarSecao'].mockReturnValue(throwError(() => ({ status: 409, error: { message: mensagem } })));
    await component.executarAcao({ tipo: 'excluir', linha: secao });
    expect(toast['warning']).toHaveBeenCalledWith(mensagem, 'Seção com documentos');
    expect(toast['success']).not.toHaveBeenCalled();
  });
});
