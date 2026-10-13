import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of, throwError, Subject } from 'rxjs';
import { vi } from 'vitest';
import { Alertas } from 'src/app/shared/utils/alerts';
import { UsuarioComponent } from './usuario.component';
import { UsuarioService } from 'src/app/shared/services/usuario/usuario.service';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';
import { ContatoService } from 'src/app/shared/services/usuario/contato.service';
import { TurmaService } from 'src/app/shared/services/turma/turma.service';

const usuario = {
  id: 1, nomeCompleto: 'Maria Silva', dataNascimento: '2015-01-01',
  cpf: '12345678901', endereco: 'Rua A', bairro: 'Centro', escola: 'Escola',
  periodoEscolar: 'MANHA', serieEscolar: 'PRIMEIRO_ANO', idUnidade: 1, idTurma: 2,
  contatos: [{ id: 8, nomeCompleto: 'Ana Silva', telefone: '11999999999', cpf: '', parentesco: 'MAE', principal: true }],
  composicaoFamiliar: [{ nomeCompleto: 'Ana Silva', parentescoVinculo: 'MAE', idade: 0, escolaridade: 'MEDIO_COMPLETO', renda: 0, beneficios: 0 }],
  fichaSocioeconomica: { tipoMoradia: 'PROPRIA', despesaAgua: 25, utilizaCarro: false, gastoCarro: 100, temAlergia: false, religiao: 'Budista' }
};

describe('Contrato de edição de usuários', () => {
  let component: UsuarioComponent;
  let fixture: ComponentFixture<UsuarioComponent>;
  let service: any;
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(Alertas, 'confirmarDescarte').mockResolvedValue(false);
    service = {
      buscarPorId: vi.fn(() => of(usuario)), listarArquivosSaude: vi.fn(() => of([])),
      atualizar: vi.fn(() => of(usuario)), criar: vi.fn(() => of(usuario))
    };
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideRouter([]),
      { provide: ComponentFixtureAutoDetect, useValue: false },
      { provide: ActivatedRoute, useValue: {} },
      { provide: UsuarioService, useValue: service },
      { provide: SessaoService, useValue: { podeEditarUsuario: () => true, podeGerenciarContatos: () => true } },
      { provide: ContatoService, useValue: { buscarDetalhe: vi.fn() } },
      { provide: TurmaService, useValue: { listar: () => of([]) } },
      { provide: ToastrService, useValue: { error: vi.fn(), warning: vi.fn(), success: vi.fn() } }
    ] });
    TestBed.overrideComponent(UsuarioComponent, { set: { template: '<span class="teste-nome-contato">{{ contatoPreview?.nomeCompleto }}</span>' } });
    fixture = TestBed.createComponent(UsuarioComponent);
    component = fixture.componentInstance;
    vi.spyOn(component, 'ngOnInit').mockImplementation(() => {});
    component.abrirEdicao(usuario);
    vi.spyOn(component, 'processarUploadFoto').mockImplementation(() => {});
  });

  it('preenche e reenvia família, zero, false e religião personalizada em um PUT com telefone novo e ID', () => {
    expect(component.familiaresArray.at(0).value.renda).toBe(0);
    expect(component.familiaresArray.at(0).value.idade).toBe(0);
    expect(component.formUsuario.get('complementares.temAlergia')?.value).toBe(false);
    expect(component.formUsuario.get('complementares.outraReligiao')?.value).toBe('Budista');
    component.formUsuario.get('socioeconomico.despesaAgua')?.setValue(null);
    component.contatosArray.at(0).get('telefone')?.setValue('(11) 98888-8888');
    expect(component.contatoExistenteAlterado(0)).toBe(true);
    component.salvar();
    expect(service.atualizar).toHaveBeenCalledTimes(1);
    const dto = service.atualizar.mock.calls[0][1];
    expect(dto.contatos[0]).toMatchObject({ id: 8, telefone: '11988888888' });
    expect(dto.composicaoFamiliar[0].renda).toBe(0);
    expect(dto.fichaSocioeconomica).toMatchObject({ despesaAgua: 0, utilizaCarro: false, gastoCarro: 0, religiao: 'Budista' });
    component.contatosArray.at(0).get('telefone')?.setValue('(11) 99999-9999');
    expect(component.contatoExistenteAlterado(0)).toBe(false);
  });

  it('não permite salvar quando a consulta falha', () => {
    service.buscarPorId.mockReturnValue(throwError(() => new Error('Falha')));
    component.abrirEdicao(usuario);
    component.salvar();
    expect(service.atualizar).not.toHaveBeenCalled();
  });

  it('mantém JSON no PUT e não repete uploads de saúde no cadastro', () => {
    const upload = vi.fn(() => of(undefined));
    service.uploadArquivoSaude = upload;
    const concluir = vi.spyOn(component as any, 'concluirCadastro').mockImplementation(() => {});
    vi.mocked(component.processarUploadFoto).mockRestore();
    component.modoEdicao = false;
    component.arquivosSaude = [new File(['pdf'], 'laudo.pdf', { type: 'application/pdf' })];
    component.processarUploadFoto(1, 'Salvo');
    expect(upload).not.toHaveBeenCalled();
    expect(concluir).toHaveBeenCalledWith('Salvo');
    component.modoEdicao = true;
    component.processarUploadFoto(1, 'Salvo');
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it('começa com busca desmarcada e preserva o que foi digitado ao ativar', () => {
    const contato = component.contatosArray.at(0);
    contato.patchValue({ id: null, nomeCompleto: 'Responsável digitado', telefone: '(11) 97777-7777' });
    expect(contato.get('buscarExistente')?.value).toBe(false);
    component.alternarBuscaContato(0, true);
    expect(contato.get('id')?.value).toBeNull();
    expect(contato.get('telefone')?.value).toBe('(11) 97777-7777');
    expect(contato.get('nomeCompleto')?.value).toBe('Responsável digitado');
  });

  it('exige gasto de transporte ao marcar sim, aceitando zero como valor declarado', () => {
    const utilizaCarro = component.formUsuario.get('complementares.utilizaCarro')!;
    const gastoCarro = component.formUsuario.get('complementares.gastoCarro')!;
    gastoCarro.setValue(null);
    utilizaCarro.setValue(true);
    expect(gastoCarro.hasError('required')).toBe(true);
    gastoCarro.setValue(0);
    expect(gastoCarro.valid).toBe(true);
    utilizaCarro.setValue(false);
    expect(gastoCarro.validator).toBeNull();
  });

  it('identifica conflito quando o período escolar informado bate com a turma escolhida', () => {
    component.turmasDisponiveis = [
      { id: 2, periodo: 'MANHA', horaInicio: '08:00', horaFim: '12:00', unidade: { id: 1 } }
    ];
    component.formUsuario.get('periodoEscolar')?.setValue('MANHA');
    component.formUsuario.get('idTurma')?.setValue(2);
    expect(component.conflitoPeriodoMatricula).toBe(true);
  });

  it('bloqueia resposta incompleta, mas aceita ausência explícita de registros', () => {
    service.buscarPorId.mockReturnValue(of({ ...usuario, fichaSocioeconomica: undefined }));
    component.abrirEdicao(usuario);
    component.salvar();
    expect(service.atualizar).not.toHaveBeenCalled();
    service.buscarPorId.mockReturnValue(of({ ...usuario, composicaoFamiliar: null, fichaSocioeconomica: null }));
    component.abrirEdicao(usuario);
    expect(component.modalAberto).toBe(true);
    expect(component.familiaresArray.length).toBe(0);
  });

  it('carrega o preview completo em vez de depender da linha da listagem', () => {
    const contatoService = TestBed.inject(ContatoService);
    vi.mocked(contatoService.buscarDetalhe).mockReturnValue(of({
      id: 8, nomeCompleto: 'Ana Silva', telefone: '11999999999', cpf: '12345678901',
      email: 'ana@example.com', endereco: 'Rua Completa', localTrabalho: 'Escola', quantidadeVinculos: 1,
      vinculos: [{ idUsuario: 1, nomeUsuario: 'Maria Silva', parentesco: 'MAE', principal: true }]
    }));
    component.abrirPreviewContato({ id: 8, nomeCompleto: 'Ana', telefone: '', quantidadeVinculos: 0 });
    expect(contatoService.buscarDetalhe).toHaveBeenCalledWith(8);
    expect(component.contatoPreview).toMatchObject({
      nomeCompleto: 'Ana Silva', cpf: '123.456.789-01', endereco: 'Rua Completa', localTrabalho: 'Escola'
    });
    expect(component.contatoPreview?.vinculos).toHaveLength(1);
    expect(component.carregandoPreviewContato).toBe(false);
  });

  it('atualiza os dados do preview no DOM ao receber a resposta, sem clique', () => {
    const resposta = new Subject<any>();
    vi.mocked(TestBed.inject(ContatoService).buscarDetalhe).mockReturnValue(resposta);
    component.abrirPreviewContato({ id: 8, nomeCompleto: 'Ana', telefone: '', quantidadeVinculos: 0 });
    resposta.next({ id: 8, nomeCompleto: 'Ana Completo', telefone: '11999999999', quantidadeVinculos: 0, vinculos: [] });
    expect(fixture.nativeElement.querySelector('.teste-nome-contato').textContent).toBe('Ana Completo');
  });

  it('atualiza a tela quando as turmas do novo vínculo chegam', () => {
    const resposta = new Subject<any[]>();
    vi.spyOn(TestBed.inject(TurmaService), 'listar').mockReturnValue(resposta);
    const atualizar = vi.spyOn(component as any, 'atualizarTela');
    component.onUnidadeVinculoChange(1);
    resposta.next([{ id: 2, unidade: { id: 1 } }]);
    expect(component.turmasDoVinculo).toHaveLength(1);
    expect(component.formNovoVinculo.get('idTurma')?.enabled).toBe(true);
    expect(atualizar).toHaveBeenCalled();
  });

  it('cancela consulta do preview fechado e diferencia falha de campos ausentes', () => {
    const contatoService = TestBed.inject(ContatoService);
    const resposta = new Subject<any>();
    vi.mocked(contatoService.buscarDetalhe).mockReturnValue(resposta);
    const contato = { id: 8, nomeCompleto: 'Ana', telefone: '', quantidadeVinculos: 0 };
    component.abrirPreviewContato(contato);
    component.fecharPreviewContato();
    resposta.next({ ...contato, vinculos: [] });
    expect(component.contatoPreview).toBeNull();
    vi.mocked(contatoService.buscarDetalhe).mockReturnValue(throwError(() => new Error('Falha')));
    component.abrirPreviewContato(contato);
    expect(component.erroPreviewContato).toContain('Não foi possível');
  });

  it('preserva o ID após seleção mesmo com debounce pendente e sugestões vazias', async () => {
    vi.useFakeTimers();
    try {
      service.buscarAutocomplete = vi.fn(() => of([]));
      service.vincularContatoExistente = vi.fn(() => of(usuario));
      vi.spyOn(component, 'carregarContatos').mockImplementation(() => {});
      component.abrirNovoVinculo({ id: 8, nomeCompleto: 'Ana', telefone: '', quantidadeVinculos: 0 });
      component.formNovoVinculo.patchValue({ idUnidade: 1, idTurma: 2, parentesco: 'MAE' });
      component.formNovoVinculo.get('usuarioBusca')?.enable();
      component.formNovoVinculo.get('usuarioBusca')?.setValue('Maria');
      component.selecionarUsuarioVinculo(usuario);
      await vi.advanceTimersByTimeAsync(500);
      expect(component.formNovoVinculo.get('idUsuario')?.value).toBe(1);
      expect(component.usuariosParaVinculo).toHaveLength(0);
      await component.salvarNovoVinculo();
      expect(service.vincularContatoExistente).toHaveBeenCalledWith(1, 8, { parentesco: 'MAE', principal: false });
    } finally { vi.useRealTimers(); }
  });

  it('invalida seleção imediatamente ao editar o nome ou mudar a turma', () => {
    component.abrirNovoVinculo({ id: 8, nomeCompleto: 'Ana', telefone: '', quantidadeVinculos: 0 });
    component.selecionarUsuarioVinculo(usuario);
    component.formNovoVinculo.get('usuarioBusca')?.setValue('Outra pessoa');
    expect(component.formNovoVinculo.get('idUsuario')?.value).toBeNull();
    expect(component.usuarioSelecionadoParaVinculo).toBeNull();
    component.selecionarUsuarioVinculo(usuario);
    component.onTurmaVinculoChange(3);
    expect(component.usuarioSelecionadoParaVinculo).toBeNull();
    (component as any).fecharNovoVinculoSemConfirmacao();
  });

  it('mostra mensagens de nome, telefone e CPF incompletos nos contatos', () => {
    component.contatosArray.at(0).patchValue({ nomeCompleto: 'gg', telefone: '(11) 9', cpf: '123' });
    expect(component.mensagemErro(component.contatosArray.at(0).get('nomeCompleto'))).toBe('Mínimo de 3 caracteres.');
    expect(component.mensagemErro(component.contatosArray.at(0).get('telefone'), 'Telefone')).toBe('Telefone incompleto.');
    expect(component.mensagemErro(component.contatosArray.at(0).get('cpf'), 'CPF')).toBe('CPF incompleto.');
  });

  it('confirma descarte do vínculo e mantém os dados ao continuar editando', async () => {
    component.abrirNovoVinculo({ id: 8, nomeCompleto: 'Ana', telefone: '', quantidadeVinculos: 0 });
    component.formNovoVinculo.get('parentesco')?.setValue('MAE');
    await component.fecharNovoVinculo();
    expect(Alertas.confirmarDescarte).toHaveBeenCalledTimes(1);
    expect(component.modalNovoVinculoAberto).toBe(true);
    expect(component.formNovoVinculo.get('parentesco')?.value).toBe('MAE');
    vi.mocked(Alertas.confirmarDescarte).mockResolvedValue(true);
    await component.fecharNovoVinculo();
    expect(component.modalNovoVinculoAberto).toBe(false);
  });

  it('confirma descarte na edição do contato, inclusive para navegação', async () => {
    component.abrirEdicaoContato({ id: 8, nomeCompleto: 'Ana', telefone: '11999999999', quantidadeVinculos: 0 });
    component.modalAberto = false;
    component.formEdicaoContato.get('nomeCompleto')?.setValue('Ana Alterada');
    expect(component.formularioTemAlteracoesNaoSalvas()).toBe(true);
    await component.fecharModalContato();
    expect(component.modalContatoAberto).toBe(true);
    vi.mocked(Alertas.confirmarDescarte).mockResolvedValue(true);
    await component.fecharModalContato();
    expect(component.modalContatoAberto).toBe(false);
  });

  it('fecha contato e vínculo sem alerta quando os valores continuam iguais', async () => {
    const contato = { id: 8, nomeCompleto: 'Ana', telefone: '11999999999', quantidadeVinculos: 0 };
    component.abrirEdicaoContato(contato);
    component.formEdicaoContato.get('nomeCompleto')?.setValue('Ana Alterada');
    component.formEdicaoContato.get('nomeCompleto')?.setValue('Ana');
    await component.fecharModalContato();
    component.abrirNovoVinculo(contato);
    await component.fecharNovoVinculo();
    expect(Alertas.confirmarDescarte).not.toHaveBeenCalled();
  });

  it('salva edição de contato sem pedir descarte', () => {
    component.abrirEdicaoContato({ id: 8, nomeCompleto: 'Ana', telefone: '11999999999', quantidadeVinculos: 0 });
    component.formEdicaoContato.get('nomeCompleto')?.setValue('Ana Alterada');
    const contatoService = TestBed.inject(ContatoService);
    (contatoService as any).atualizarContato = vi.fn(() => of({}));
    vi.spyOn(component, 'carregarContatos').mockImplementation(() => {});
    component.salvarEdicaoContato();
    expect(component.modalContatoAberto).toBe(false);
    expect(Alertas.confirmarDescarte).not.toHaveBeenCalled();
  });

  it('habilita ordenação em todas as colunas de dados', () => {
    expect(component.colunas.every(coluna => coluna.ordenavel)).toBe(true);
    expect(component.colunasContatos.every(coluna => coluna.ordenavel)).toBe(true);
  });

  it('ordena pelo documento alternativo e pela unidade exibida antes de paginar', () => {
    component.usuariosListagem = [
      { ...usuario, id: 1, cpf: '', documentoAuxiliar: 'DOC-20', nomeUnidade: 'Zulu', nomeTurma: 'MANHA' },
      { ...usuario, id: 2, cpf: '', documentoAuxiliar: 'DOC-3', nomeUnidade: 'Alfa', nomeTurma: 'TARDE' }
    ];
    component.ordenacao = { campo: 'cpf', direcao: 'asc' };
    component.aplicarPaginacao();
    expect(component.usuarios.map(u => u.id)).toEqual([2, 1]);
    component.ordenacao = { campo: 'nomeTurma', direcao: 'desc' };
    component.aplicarPaginacao();
    expect(component.usuarios.map(u => u.id)).toEqual([1, 2]);
  });

  it('exibe erro de telefone retornado pela API e permite corrigir o campo', () => {
    const mensagem = 'Já existe outro contato cadastrado com este telefone.';
    service.atualizar.mockReturnValue(throwError(() => ({ error: { message: mensagem } })));
    component.salvar();
    const telefone = component.contatosArray.at(0).get('telefone')!;
    expect(component.etapaModal).toBe(2);
    expect(component.mensagemErro(telefone, 'Telefone')).toBe(mensagem);
    telefone.setValue('(11) 98888-8888');
    expect(telefone.hasError('servidor')).toBe(false);
  });

  it('exibe conflito de telefone na edição centralizada', () => {
    component.abrirEdicaoContato({ id: 8, nomeCompleto: 'Ana', telefone: '11999999999', quantidadeVinculos: 0 });
    const mensagem = 'Já existe outro contato cadastrado com este telefone.';
    (TestBed.inject(ContatoService) as any).atualizarContato = vi.fn(() => throwError(() => ({ error: { message: mensagem } })));
    component.salvarEdicaoContato();
    expect(component.mensagemErro(component.formEdicaoContato.get('telefone'))).toBe(mensagem);
    expect(component.modalContatoAberto).toBe(true);
  });

  it('exibe a data de nascimento sem deslocamento de fuso horário', () => {
    const coluna = component.colunas.find(coluna => coluna.chave === 'dataNascimento')!;
    expect(coluna.formatar!('2004-11-03', usuario)).toBe('03/11/2004');
    expect(component.formatarDataNascimento('2004-11-03T00:00:00')).toBe('03/11/2004');
    expect(component.formatarDataNascimento(null)).toBe('-');
  });

  it('considera os anexos salvos no limite de quatro', () => {
    component.arquivosSaudeSalvos = [1, 2, 3, 4].map(id => ({ id, titulo: 'Laudo' }));
    const input = { files: [new File(['pdf'], 'laudo.pdf', { type: 'application/pdf' })], value: 'laudo.pdf' };
    component.selecionarArquivosSaude({ target: input } as unknown as Event);
    expect(component.arquivosSaude).toHaveLength(0);
    expect(component.erroArquivos).toContain('4');
  });

  it('rejeita anexo de saúde acima do limite padrão e informa o limite', () => {
    const arquivo = new File(['png'], 'laudo.png', { type: 'image/png' });
    Object.defineProperty(arquivo, 'size', { value: 10 * 1024 * 1024 + 1 });
    const input = { files: [arquivo], value: 'laudo.png' };
    component.selecionarArquivosSaude({ target: input } as unknown as Event);
    expect(component.arquivosSaude).toHaveLength(0);
    expect(component.erroArquivos).toContain('10MB');
    expect(input.value).toBe('');
  });

  it('aceita quatro anexos dentro do limite padrão', () => {
    const arquivos = [1, 2, 3, 4].map(id => {
      const arquivo = new File(['png'], `laudo${id}.png`, { type: 'image/png' });
      Object.defineProperty(arquivo, 'size', { value: 10 * 1024 * 1024 });
      return arquivo;
    });
    const input = { files: arquivos, value: 'laudos' };
    component.selecionarArquivosSaude({ target: input } as unknown as Event);
    expect(component.arquivosSaude).toHaveLength(4);
    expect(component.erroArquivos).toBe('');
    expect(component.arquivosSaude.reduce((total, arquivo) => total + arquivo.size, 0)).toBe(40 * 1024 * 1024);
  });
});
