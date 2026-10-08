import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ToastrService } from 'ngx-toastr';
import { provideRouter } from '@angular/router';
import { Diario } from './diario';
import { DiarioService } from 'src/app/shared/services/diario/diario.service';
import { TurmaService } from 'src/app/shared/services/turma/turma.service';
import { UnidadeService } from 'src/app/shared/services/unidade/unidade.service';
import { Alertas } from 'src/app/shared/utils/alerts';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';

describe('Diário de turma', () => {
  let fixture: ComponentFixture<Diario>;
  let component: Diario;
  let papel: string;
  let api: any;
  let turmas: any;
  let toastr: any;
  const aluno = (statusMatricula = 'ATIVO', idMatricula = 1) => ({
    idMatricula, idUsuario: idMatricula, nomeUsuario: 'Aluno ' + idMatricula,
    imagemPerfil: '', statusMatricula, permiteAcessoPerfil: true,
    isUsuarioExcluido: statusMatricula === 'EXCLUIDO',
    idFrequencia: null, presente: null, ocorrencias: []
  });
  const ocorrencia = (dataCriacao: string) => ({
    id: 1, idMatricula: 1, dataCriacao, dataOcorrencia: '2026-10-06',
    descricao: 'Registro', tipoOcorrencia: 'SAUDE' as const, nomeMembro: 'Monitor'
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-06T12:00:00-03:00'));
    papel = 'MONITOR';
    vi.spyOn(Alertas, 'confirmarDescarte').mockResolvedValue(false);
    api = {
      listarFrequencia: vi.fn(() => of([aluno()])), salvarEmLote: vi.fn(() => of(undefined)),
      criarOcorrencia: vi.fn(() => of(ocorrencia('2026-10-06T12:00:00'))),
      atualizarOcorrencia: vi.fn(), deletarOcorrencia: vi.fn()
    };
    turmas = { listar: vi.fn(() => of([{ id: 2, unidade: { id: 1 }, horaInicio: '08:00', horaFim: '12:00', periodo: 'MANHA' }])) };
    toastr = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
    TestBed.configureTestingModule({ imports: [Diario], providers: [
      provideRouter([]),
      { provide: DiarioService, useValue: api }, { provide: TurmaService, useValue: turmas },
      { provide: UnidadeService, useValue: { listarTodas: () => of([{ id: 1, nome: 'Unidade' }]) } },
      { provide: SessaoService, useValue: {
        carregar: () => of({}), unidadesPermitidasIds: () => [1],
        isMonitor: () => papel === 'MONITOR', isCoordenador: () => papel === 'COORDENADOR',
        isAdministrador: () => papel === 'ADMINISTRADOR'
      } },
      { provide: ToastrService, useValue: toastr }
    ] });
    fixture = TestBed.createComponent(Diario);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.filtroForm.get('idUnidade')!.setValue(1);
    component.filtroForm.get('idTurma')!.setValue(2);
  });

  afterEach(() => { fixture.destroy(); vi.useRealTimers(); vi.restoreAllMocks(); });

  it('carrega turma em cascata e consulta novamente ao mudar data', () => {
    expect(turmas.listar).toHaveBeenCalledWith(1);
    component.filtroForm.get('data')!.setValue('2026-10-03');
    expect(api.listarFrequencia).toHaveBeenLastCalledWith(2, '2026-10-03');
  });

  it('limpa a chamada ao confirmar remoção da turma, sem spinner preso', async () => {
    vi.mocked(Alertas.confirmarDescarte).mockResolvedValue(true);
    component.iniciarChamada(); component.declaracaoAceita = true;
    component.filtroForm.get('idTurma')!.setValue(null);
    await Promise.resolve();
    expect(component.usuarios).toEqual([]);
    expect(component.estadoTela).toBe('VAZIO');
    expect(component.declaracaoAceita).toBe(false);
    expect(component.carregando).toBe(false);
  });

  it('mantém listeners após falha HTTP e cancela resposta obsoleta', () => {
    api.listarFrequencia.mockReturnValueOnce(throwError(() => new Error('HTTP')));
    component.filtroForm.get('data')!.setValue('2026-10-03');
    const antigo = new Subject<any[]>();
    api.listarFrequencia.mockReturnValueOnce(antigo);
    component.filtroForm.get('data')!.setValue('2026-10-04');
    expect(component.usuarios).toEqual([]);
    component.filtroForm.get('data')!.setValue('2026-10-05');
    antigo.next([aluno('ATIVO', 99)]);
    expect(component.usuarios[0].idMatricula).toBe(1);
    expect(component.carregando).toBe(false);
  });

  it('descarta resposta de turmas de unidade anterior', () => {
    const antiga = new Subject<any[]>();
    turmas.listar.mockReturnValueOnce(antiga).mockReturnValueOnce(of([{ id: 3, unidade: { id: 3 } }]));
    component.filtroForm.get('idUnidade')!.setValue(2);
    component.filtroForm.get('idUnidade')!.setValue(3);
    antiga.next([{ id: 9, unidade: { id: 1 } }]);
    expect(component.turmas.map(t => t.id)).toEqual([3]);
  });

  it('bloqueia início antes do horário e permite no instante exato', () => {
    component.turmas[0].horaInicio = '12:00:01';
    component.iniciarChamada(); expect(component.estadoTela).toBe('INICIAL');
    vi.setSystemTime(new Date('2026-10-06T12:00:01-03:00'));
    expect(component.podeIniciarChamada).toBe(true);
  });

  it('inicia todos presentes e salva matrículas históricas com declaração', () => {
    component.usuarios = [aluno(), aluno('EGRESSO', 2), aluno('EXCLUIDO', 3)];
    component.iniciarChamada();
    expect(component.usuarios.every(u => u.presente === true)).toBe(true);
    component.marcarFrequencia(component.usuarios[2], false);
    component.salvarDiarioLote(); expect(api.salvarEmLote).not.toHaveBeenCalled();
    component.declaracaoAceita = true; component.salvarDiarioLote();
    expect(api.salvarEmLote.mock.calls[0][0].frequencias).toEqual([
      { idMatricula: 1, presente: true }, { idMatricula: 2, presente: true }, { idMatricula: 3, presente: false }
    ]);
  });

  it('desabilita salvar sem declaração e oculta iniciar/salvar após sucesso', () => {
    component.iniciarChamada(); fixture.detectChanges();
    const salvar = () => Array.from(fixture.nativeElement.querySelectorAll('button')).find((b: any) => b.textContent.trim() === 'Salvar') as HTMLButtonElement;
    expect(salvar().disabled).toBe(true);
    component.declaracaoAceita = true;
    api.listarFrequencia.mockReturnValue(of([{ ...aluno(), idFrequencia: 20, presente: true }]));
    component.salvarDiarioLote(); fixture.detectChanges();
    expect(component.estadoTela).toBe('SALVO');
    expect(salvar()).toBeUndefined();
    expect(fixture.nativeElement.textContent).not.toContain('Registrar frequências');
    expect(fixture.nativeElement.querySelector('.toggle-fp').disabled).toBe(true);
  });

  it('preserva preenchimento após erro e impede envio duplicado', () => {
    const salvar = new Subject<void>(); api.salvarEmLote.mockReturnValue(salvar);
    component.iniciarChamada(); component.declaracaoAceita = true;
    component.salvarDiarioLote(); component.salvarDiarioLote();
    expect(api.salvarEmLote).toHaveBeenCalledTimes(1);
    salvar.error(new Error('HTTP'));
    expect(component.estadoTela).toBe('PREENCHENDO'); expect(component.salvando).toBe(false);
  });

  it('atualiza a tela após POST assíncrono enquanto o GET de recarga está pendente', async () => {
    papel = 'ADMINISTRADOR';
    const salvar = new Subject<void>(); const recarga = new Subject<any[]>();
    api.salvarEmLote.mockReturnValue(salvar);
    api.listarFrequencia.mockReturnValue(recarga);
    component.iniciarChamada(); component.declaracaoAceita = true;
    component.salvarDiarioLote(); await vi.advanceTimersByTimeAsync(100);
    expect(fixture.nativeElement.querySelector('.diario-header').hasAttribute('inert')).toBe(true);
    salvar.next(); salvar.complete(); await vi.advanceTimersByTimeAsync(100);
    expect(fixture.nativeElement.querySelector('.diario-header').hasAttribute('inert')).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Carregando usuários');
    recarga.next([{ ...aluno(), idFrequencia: 10, presente: true }]); recarga.complete();
    await vi.advanceTimersByTimeAsync(100); expect(component.estadoTela).toBe('SALVO');
  });

  it('conta 48h desde início da turma, permitindo o limite exato', () => {
    component.filtroForm.get('data')!.setValue('2026-10-04');
    vi.setSystemTime(new Date('2026-10-06T08:00:00-03:00'));
    expect(component.podeEditarFrequencia).toBe(true);
    vi.setSystemTime(new Date('2026-10-06T08:00:00.001-03:00'));
    expect(component.podeEditarFrequencia).toBe(false);
  });

  it('remove editar e desabilita toggles em chamada de três dias atrás', () => {
    api.listarFrequencia.mockReturnValue(of([{ ...aluno(), idFrequencia: 10, presente: true }]));
    component.filtroForm.get('data')!.setValue('2026-10-03'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.toggle-fp').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.btn-editar-diario')).toBeNull();
    component.editarChamada(); expect(component.estadoTela).toBe('SALVO');
  });

  it('permite ocorrência até sete dias, bloqueia oito dias e futuro', () => {
    component.filtroForm.get('data')!.setValue('2026-09-29');
    expect(component.podeAdicionarOcorrencia).toBe(true);
    component.filtroForm.get('data')!.setValue('2026-09-28'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.btn-badge-ocorrencia')).toBeNull();
    component.abrirGerenciadorOcorrencias(component.usuarios[0]); expect(component.modalOcorrenciaAberto).toBe(false);
    component.usuarioSelecionado = aluno(); component.modoOcorrencia = 'NOVO';
    component.formOcorrencia.setValue({ horaStr: '12:00', descricao: 'Descrição', tipoOcorrencia: 'SAUDE' });
    component.salvarOcorrencia(); expect(api.criarOcorrencia).not.toHaveBeenCalled();
    component.filtroForm.get('data')!.setValue('2026-10-07'); expect(component.podeAdicionarOcorrencia).toBe(false);
  });

  it('abre formulário ou lista e remove editar/excluir após 24h da criação', () => {
    component.abrirGerenciadorOcorrencias(component.usuarios[0]); expect(component.modoOcorrencia).toBe('NOVO');
    component.usuarioSelecionado!.ocorrencias = [ocorrencia('2026-10-05T11:59:59')];
    component.abrirGerenciadorOcorrencias(component.usuarioSelecionado!); expect(component.modoOcorrencia).toBe('LISTA');
    expect(component.podeEditarExcluirOcorrencia(ocorrencia('2026-10-05T12:00:00'))).toBe(true);
    expect(component.podeEditarExcluirOcorrencia(ocorrencia('2026-10-05T11:59:59'))).toBe(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.icon-edit')).toBeNull();
    expect(fixture.nativeElement.querySelector('.icon-delete')).toBeNull();
    expect(fixture.nativeElement.querySelector('.icon-view')).not.toBeNull();
  });

  it.each(['COORDENADOR', 'ADMINISTRADOR'])('%s permite edição de um mês atrás', perfil => {
    papel = perfil;
    api.listarFrequencia.mockReturnValue(of([{ ...aluno('EXCLUIDO'), idFrequencia: 10, presente: true }]));
    component.filtroForm.get('data')!.setValue('2026-09-06');
    expect(component.podeEditarFrequencia).toBe(true); expect(component.podeAdicionarOcorrencia).toBe(true);
    expect(component.podeEditarExcluirOcorrencia(ocorrencia('2026-09-06T08:00:00'))).toBe(true);
    component.editarChamada(); expect(component.estadoTela).toBe('PREENCHENDO');
  });

  it.each([
    ['data', '2026-10-05'], ['idUnidade', 2], ['idTurma', null]
  ])('preserva filtros e preenchimento ao cancelar troca de %s', async (campo, valor) => {
    component.iniciarChamada();
    component.marcarFrequencia(component.usuarios[0], false);
    component.declaracaoAceita = true;
    const filtros = component.filtroForm.getRawValue();
    const alunos = component.usuarios;
    const listaTurmas = component.turmas;
    api.listarFrequencia.mockClear(); turmas.listar.mockClear();
    component.filtroForm.get(campo as string)!.setValue(valor);
    await Promise.resolve();
    expect(Alertas.confirmarDescarte).toHaveBeenCalledTimes(1);
    expect(component.filtroForm.getRawValue()).toEqual(filtros);
    expect(component.usuarios).toBe(alunos);
    expect(component.usuarios[0].presente).toBe(false);
    expect(component.turmas).toBe(listaTurmas);
    expect(component.estadoTela).toBe('PREENCHENDO');
    expect(component.declaracaoAceita).toBe(true);
    expect(api.listarFrequencia).not.toHaveBeenCalled();
    expect(turmas.listar).not.toHaveBeenCalled();
  });

  it('confirma troca pelas setas uma única vez e recarrega a data escolhida', async () => {
    let responder!: (confirmado: boolean) => void;
    vi.mocked(Alertas.confirmarDescarte).mockReturnValue(new Promise(resolve => responder = resolve));
    component.iniciarChamada();
    component.alterarData(-1); component.alterarData(-1);
    fixture.detectChanges();
    expect(Alertas.confirmarDescarte).toHaveBeenCalledTimes(1);
    expect(component.filtroForm.get('data')!.value).toBe('2026-10-06');
    expect(fixture.nativeElement.querySelector('.diario-header').hasAttribute('inert')).toBe(true);
    responder(true); await Promise.resolve(); fixture.detectChanges();
    expect(api.listarFrequencia).toHaveBeenLastCalledWith(2, '2026-10-05');
    expect(component.estadoTela).toBe('INICIAL');
    expect(component.confirmandoTrocaFiltro).toBe(false);
    expect(fixture.nativeElement.querySelector('.diario-header').hasAttribute('inert')).toBe(false);
  });

  it('só limpa a turma e carrega a nova unidade depois de confirmar', async () => {
    vi.mocked(Alertas.confirmarDescarte).mockResolvedValue(true);
    component.iniciarChamada();
    turmas.listar.mockClear();
    component.filtroForm.get('idUnidade')!.setValue(2);
    expect(component.filtroForm.get('idUnidade')!.value).toBe(1);
    expect(component.filtroForm.get('idTurma')!.value).toBe(2);
    expect(turmas.listar).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(component.filtroForm.get('idUnidade')!.value).toBe(2);
    expect(component.filtroForm.get('idTurma')!.value).toBeNull();
    expect(turmas.listar).toHaveBeenCalledWith(2);
    expect(component.usuarios).toEqual([]);
  });

  it('preserva o formulário de ocorrência ao cancelar a troca pelo calendário', async () => {
    component.abrirGerenciadorOcorrencias(component.usuarios[0]);
    component.formOcorrencia.get('descricao')!.setValue('Descrição não salva');
    component.formOcorrencia.markAsDirty();
    component.filtroForm.get('data')!.setValue('2026-10-05');
    await Promise.resolve();
    expect(component.modalOcorrenciaAberto).toBe(true);
    expect(component.formOcorrencia.get('descricao')!.value).toBe('Descrição não salva');
    expect(component.formOcorrencia.dirty).toBe(true);
    expect(component.filtroForm.get('data')!.value).toBe('2026-10-06');
  });

  it('troca filtros sem confirmação quando não há preenchimento', () => {
    component.alterarData(-1);
    expect(Alertas.confirmarDescarte).not.toHaveBeenCalled();
    expect(api.listarFrequencia).toHaveBeenLastCalledWith(2, '2026-10-05');
  });

  it('exibe o nome do aluno como link discreto para o perfil', () => {
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('.usuario-perfil-link') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.textContent?.trim()).toBe('Aluno 1');
    expect(link.getAttribute('href')).toBe('/dashboard/usuarios/1?returnUrl=%2F');
  });

  it('bloqueia o perfil quando a API nega acesso e mostra aviso', () => {
    component.usuarios = [{ ...aluno('ATIVO', 1), permiteAcessoPerfil: false }];
    component.estadoTela = 'INICIAL';
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a.usuario-perfil-link');
    const botao = fixture.nativeElement.querySelector('button.usuario-perfil-link--disabled') as HTMLButtonElement;
    expect(link).toBeNull();
    expect(botao.textContent?.trim()).toBe('Aluno 1');
    botao.click();
    expect(toastr.warning).toHaveBeenCalledWith(
      'O perfil deste usuário foi excluído do sistema.'
    );
  });

  it('exibe tag de excluído pela flag retroativa, não pelo status histórico', () => {
    component.usuarios = [{ ...aluno('ATIVO', 1), isUsuarioExcluido: true }];
    component.estadoTela = 'INICIAL';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.badge-excluido')?.textContent.trim()).toBe('Excluído');
  });

});
