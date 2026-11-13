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
      listarSecoesParaOrdenacao: vi.fn(() => of([
        { ...secao, id: 8, titulo: 'Financeiro', ordem: 1 },
        { ...secao, id: 3, ordem: 2, ativo: false },
        { ...secao, id: 9, titulo: 'Estatuto', ordem: 3 },
      ])),
      reordenarSecoes: vi.fn(() => of(undefined)),
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
  afterEach(() => { fixture?.destroy(); vi.restoreAllMocks(); vi.unstubAllGlobals(); TestBed.resetTestingModule(); });

  function criar() {
    fixture = TestBed.createComponent(Transparencia); component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('confirma a troca de aba apenas quando a ordem foi alterada', async () => {
    params.next(convertToParamMap({ aba: 'secoes' }));
    criar(); component.iniciarReordenacao(); component.moverSecao(0, 1);
    const confirmar = vi.spyOn(Alertas, 'confirmarDescarte').mockResolvedValue(false);
    await component.mudarAba('documentos');
    expect(confirmar).toHaveBeenCalledOnce();
    expect(navegar).not.toHaveBeenCalled();
    expect(component.secoesOrdenacao.map(s => s.id)).toEqual([3, 8, 9]);
    confirmar.mockResolvedValue(true);
    await component.mudarAba('documentos');
    expect(component.reordenando).toBe(false);
    expect(navegar).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: expect.objectContaining({ aba: 'documentos' }) }));
  });

  it('intercepta o clique externo e só executa a ação após confirmar o descarte', async () => {
    params.next(convertToParamMap({ aba: 'secoes' }));
    criar(); component.iniciarReordenacao(); component.moverSecao(0, 1);
    const confirmar = vi.spyOn(Alertas, 'confirmarDescarte').mockResolvedValue(false);
    const botao = document.createElement('button');
    const abrir = vi.fn();
    botao.addEventListener('click', abrir);
    document.body.append(botao);
    try {
      botao.click();
      await vi.waitFor(() => expect(Reflect.get(component, 'confirmacaoDescarte')).toBeNull());
      expect(abrir).not.toHaveBeenCalled();
      expect(component.temAlteracoesOrdem).toBe(true);
      confirmar.mockResolvedValue(true);
      botao.click();
      await vi.waitFor(() => expect(abrir).toHaveBeenCalledOnce());
      expect(component.reordenando).toBe(false);
    } finally { botao.remove(); }
  });

  it('sai sem confirmação quando a sequência original está preservada', async () => {
    params.next(convertToParamMap({ aba: 'secoes' }));
    criar(); component.iniciarReordenacao();
    const confirmar = vi.spyOn(Alertas, 'confirmarDescarte');
    component.moverSecao(0, 1); component.moverSecao(1, -1);
    await component.mudarAba('documentos');
    expect(confirmar).not.toHaveBeenCalled();
    expect(component.reordenando).toBe(false);
    expect(navegar).toHaveBeenCalled();
  });

  it('reordena pelo arraste e mantém as setas e os indicadores disponíveis', () => {
    params.next(convertToParamMap({ aba: 'secoes' }));
    criar(); component.iniciarReordenacao(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.arrastar-secao')).toHaveLength(3);
    component.soltarSecao({ previousIndex: 0, currentIndex: 2 } as Parameters<Transparencia['soltarSecao']>[0]);
    expect(component.secoesOrdenacao.map(s => s.id)).toEqual([3, 9, 8]);
    expect(component.temAlteracoesOrdem).toBe(true);
    expect(component.anuncioOrdem).toContain('posição 3');
    expect(fixture.nativeElement.querySelectorAll('.mover-secao')).toHaveLength(6);
  });

  it('consulta a sequência salva por padrão e exibe a coluna Ordem', () => {
    params.next(convertToParamMap({ aba: 'secoes' }));
    api['listarSecoesAdmin'].mockReturnValue(of(pagina([{ ...secao, ordem: 2 }])));
    criar();
    expect(api['listarSecoesAdmin']).toHaveBeenLastCalledWith(0, 10, 'ordem,asc', undefined);
    expect(component.ordenacao).toEqual({ campo: 'ordem', direcao: 'asc' });
    const tabela = fixture.nativeElement.querySelector('app-tabela-layout');
    expect(tabela.querySelector('th').textContent).toContain('Ordem');
    expect(tabela.querySelector('.celula-dado').textContent.trim()).toBe('2');
  });

  it('reordena todas as seções, preserva a consulta e cancela sem gravar', () => {
    params.next(convertToParamMap({ aba: 'secoes', search: 'Ata', page: '2', sort: 'titulo,desc' }));
    criar(); component.iniciarReordenacao(); fixture.detectChanges();
    expect(component.secoesOrdenacao.map(s => s.id)).toEqual([8, 3, 9]);
    expect(fixture.nativeElement.querySelector('input[type=search]').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('app-paginacao')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-tabela-layout')).toBeNull();
    const setas = fixture.nativeElement.querySelectorAll('.mover-secao');
    expect(setas[0].disabled).toBe(true); expect(setas[5].disabled).toBe(true);
    component.moverSecao(0, -1); component.moverSecao(2, 1);
    expect(component.temAlteracoesOrdem).toBe(false);
    component.moverSecao(1, -1);
    expect(component.secoesOrdenacao.map(s => s.id)).toEqual([3, 8, 9]);
    expect(component.formularioTemAlteracoesNaoSalvas()).toBe(true);
    component.cancelarReordenacao();
    expect(component.reordenando).toBe(false);
    expect(component.busca).toBe('Ata'); expect(component.pagina).toBe(2);
    expect(component.sort).toBe('titulo,desc');
    expect(api['reordenarSecoes']).not.toHaveBeenCalled();
  });

  it('salva uma única permutação e bloqueia movimentos enquanto processa', () => {
    criar(); component.abaAtiva = 'secoes'; component.iniciarReordenacao();
    component.moverSecao(0, 1);
    const resposta = new Subject<void>(); api['reordenarSecoes'].mockReturnValue(resposta);
    component.salvarOrdem(); component.salvarOrdem(); component.moverSecao(0, 1);
    component.cancelarReordenacao();
    expect(api['reordenarSecoes']).toHaveBeenCalledTimes(1);
    expect(api['reordenarSecoes']).toHaveBeenCalledWith([
      { id: 3, ordem: 1 }, { id: 8, ordem: 2 }, { id: 9, ordem: 3 },
    ]);
    expect(component.reordenando).toBe(true);
    expect(component.secoesOrdenacao.map(s => s.id)).toEqual([3, 8, 9]);
    resposta.next(); resposta.complete();
    expect(component.reordenando).toBe(false); expect(toast['success']).toHaveBeenCalled();
  });

  it('restaura a ordem salva na falha e permite nova tentativa', () => {
    criar(); component.abaAtiva = 'secoes'; component.iniciarReordenacao();
    component.moverSecao(0, 1);
    api['reordenarSecoes'].mockReturnValue(throwError(() => new Error('offline')));
    component.salvarOrdem();
    expect(component.secoesOrdenacao.map(s => s.id)).toEqual([8, 3, 9]);
    expect(component.temAlteracoesOrdem).toBe(false);
    expect(component.salvandoOrdem).toBe(false); expect(component.reordenando).toBe(true);
    expect(toast['error']).toHaveBeenCalled();
    api['reordenarSecoes'].mockReturnValue(of(undefined));
    component.moverSecao(0, 1); component.salvarOrdem();
    expect(component.reordenando).toBe(false);
  });

  it('não entra no modo se a consulta completa falhar', () => {
    criar(); component.abaAtiva = 'secoes';
    api['listarSecoesParaOrdenacao'].mockReturnValue(throwError(() => new Error('offline')));
    component.iniciarReordenacao();
    expect(component.reordenando).toBe(false); expect(component.carregandoOrdem).toBe(false);
    expect(toast['error']).toHaveBeenCalled();
  });

  it('mantém salvar e cancelar acessíveis se o histórico do navegador mudar a aba', () => {
    params.next(convertToParamMap({ aba: 'secoes' }));
    criar(); component.iniciarReordenacao(); component.moverSecao(0, 1);
    params.next(convertToParamMap({ aba: 'documentos', search: 'Ata' }));
    fixture.detectChanges();
    expect(component.abaAtiva).toBe('secoes');
    expect(fixture.nativeElement.textContent).toContain('Salvar ordem');
    expect(component.secoesOrdenacao.map(s => s.id)).toEqual([3, 8, 9]);
    component.cancelarReordenacao();
    expect(component.abaAtiva).toBe('documentos'); expect(component.busca).toBe('Ata');
  });

  it('mantém o foco na seção movida ao alcançar o limite da lista', () => {
    params.next(convertToParamMap({ aba: 'secoes' }));
    criar(); component.iniciarReordenacao(); fixture.detectChanges();
    const seta = fixture.nativeElement.querySelectorAll('.mover-secao')[2] as HTMLButtonElement;
    seta.focus(); seta.click(); fixture.detectChanges();
    const linha = fixture.nativeElement.querySelector('.linha-ordenacao') as HTMLElement;
    expect(linha.textContent).toContain('Atas');
    expect(linha.contains(document.activeElement)).toBe(true);
    expect((document.activeElement as HTMLButtonElement).disabled).toBe(false);
  });

  it('anima as duas linhas em sentidos opostos e limpa a animação ao cancelar', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    params.next(convertToParamMap({ aba: 'secoes' }));
    criar(); component.iniciarReordenacao(); fixture.detectChanges();
    const linhas = Array.from(fixture.nativeElement.querySelectorAll('.linha-ordenacao')) as HTMLElement[];
    const animacoes = linhas.map(() => ({ cancel: vi.fn(), onfinish: null }));
    const animar = linhas.map((linha, indice) => {
      vi.spyOn(linha, 'getBoundingClientRect').mockImplementation(() => ({
        top: Array.from(linha.parentElement!.children).indexOf(linha) * 72,
      }) as DOMRect);
      const animate = vi.fn(() => animacoes[indice]);
      Object.defineProperty(linha, 'animate', { configurable: true, value: animate });
      return animate;
    });
    component.moverSecao(0, 1);
    expect(animar[0]).toHaveBeenCalledWith([
      { transform: 'translateY(-72px)' }, { transform: 'translateY(0)' },
    ], expect.objectContaining({ duration: 240 }));
    expect(animar[1]).toHaveBeenCalledWith([
      { transform: 'translateY(72px)' }, { transform: 'translateY(0)' },
    ], expect.objectContaining({ duration: 240 }));
    expect(animar[2]).not.toHaveBeenCalled();
    component.cancelarReordenacao();
    expect(animacoes[0].cancel).toHaveBeenCalled(); expect(animacoes[1].cancel).toHaveBeenCalled();
  });

  it('move sem animar quando o usuário prefere movimento reduzido', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    params.next(convertToParamMap({ aba: 'secoes' }));
    criar(); component.iniciarReordenacao(); fixture.detectChanges();
    const linhas = Array.from(fixture.nativeElement.querySelectorAll('.linha-ordenacao')) as HTMLElement[];
    const animar = vi.fn();
    linhas.forEach(linha => Object.defineProperty(linha, 'animate', { configurable: true, value: animar }));
    component.moverSecao(0, 1);
    expect(component.secoesOrdenacao.map(s => s.id)).toEqual([3, 8, 9]);
    expect(animar).not.toHaveBeenCalled();
  });

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
