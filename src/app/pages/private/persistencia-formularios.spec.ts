import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { vi } from 'vitest';
import { ToastrService } from 'ngx-toastr';
import { EventoComponent } from './content-management/components/evento/evento.component';
import { DiretoriaComponent } from './content-management/components/diretoria/diretoria.component';
import { PartnersManager } from './content-management/components/parceiro/partners-manager';
import { SocialLinksManager } from './content-management/components/redes-sociais/social-links-manager';
import { Transparencia } from './content-management/components/transparencia/transparencia';
import { Sobre } from './content-management/components/sobre/sobre';
import { CaptacaoRecursos } from './content-management/components/captacao-recursos/captacao-recursos';
import { CAPTACAO_RECURSOS_CONFIG } from './content-management/components/captacao-recursos/captacao-recursos.config';
import { UnidadesTurmas } from './unidades-turmas/unidades-turmas';
import { ColaboradorComponent } from './colaborador/colaborador.component';
import { Perfil } from './perfil/perfil';
import { EventoService } from 'src/app/shared/services/content-management/evento/evento.service';
import { DiretoriaService } from 'src/app/shared/services/content-management/diretoria/diretoria.service';
import { PartnersService } from 'src/app/shared/services/content-management/parceiro/partners.service';
import { SocialLinksService } from 'src/app/shared/services/content-management/redes-sociais/social-links.service';
import { UnidadeService } from 'src/app/shared/services/unidade/unidade.service';
import { TurmaService } from 'src/app/shared/services/turma/turma.service';
import { ColaboradorService } from 'src/app/shared/services/colaborador/colaborador.service';
import { PerfilService } from 'src/app/shared/services/colaborador/perfil.service';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';
import { Auth } from 'src/app/shared/services/auth/auth';
import { SecoesGrupoService } from 'src/app/shared/services/pagina/secoes-grupo.service';
import { TransparenciaService } from './content-management/components/transparencia/transparencia.service';
import { SobreService } from './content-management/components/sobre/sobre.service';
import { UsuarioService } from 'src/app/shared/services/usuario/usuario.service';
import { CepService } from 'src/app/shared/services/usuario/cep.service';
import { UsuarioPerfilDadosSocioeconomicos } from './usuario/usuario-perfil/components/dados-socioeconomicos/dados-socioeconomicos';
import { UsuarioPerfilSaude } from './usuario/usuario-perfil/components/saude/saude';
import { UsuarioPerfilDadosPessoais } from './usuario/usuario-perfil/components/dados-pessoais/dados-pessoais';

interface CasoPersistencia {
  nome: string;
  componente: Type<any>;
  servico: Type<any>;
  metodo?: string;
  formulario: string;
  salvar: string;
  original: Record<string, any>;
  alteracoes: Record<string, any>;
  abrir: (componente: any, original: any) => void;
  preservados?: Record<string, any>;
  indiceDto?: number;
}

const unidade = { id: 1, nome: 'Unidade Central', endereco: 'Rua das Flores', telefone: '16999999999',
  email: 'unidade@example.org', diasFuncionamento: 'SEG;TER', horarioAbertura: '08:00:00',
  horarioFechamento: '18:00:00', idadeMin: 6, idadeMax: 17, corHex: '#80A835', imagem: '/uploads/unidade.png' };

const casos: CasoPersistencia[] = [
  { nome: 'eventos', componente: EventoComponent, servico: EventoService, formulario: 'formEvento', salvar: 'salvar',
    original: { id: 1, titulo: 'Festival', descricao: 'Descrição original', dataEvento: '2026-11-20T10:15:00',
      endereco: 'Rua das Flores', tipoEvento: 'CULTURAL', valor: 25.75, parceiros: [{ id: 2 }], imagem: '/uploads/evento.png' },
    alteracoes: { titulo: 'Festival atualizado', descricao: 'Descrição atualizada', dataEvento: '2026-11-21T11:15',
      endereco: 'Rua das Rosas', tipoEvento: 'COMEMORATIVO', parceirosIds: [3] },
    preservados: { parceirosIds: [2], valor: 25.75 }, abrir: (c, o) => c.abrirEdicao(o) },
  { nome: 'diretoria', componente: DiretoriaComponent, servico: DiretoriaService, formulario: 'formDiretoria', salvar: 'salvar',
    original: { id: 1, nome: 'Maria Silva', cargo: 'Presidente', ativo: false, foto: '/uploads/diretora.png' },
    alteracoes: { nome: 'Maria Souza', cargo: 'Vice-presidente', ativo: true }, abrir: (c, o) => c.abrirEdicao(o) },
  { nome: 'parceiros', componente: PartnersManager, servico: PartnersService, metodo: 'update', formulario: 'form', salvar: 'salvarParceiro',
    original: { id: 1, nome: 'Associação Local', ativo: false, logo: '/uploads/parceiro.png' },
    alteracoes: { nome: 'Associação Regional', ativo: true }, abrir: (c, o) => c.abrirModal(o) },
  { nome: 'redes sociais', componente: SocialLinksManager, servico: SocialLinksService, metodo: 'update', formulario: 'form', salvar: 'salvarRedeSocial',
    original: { id: 1, nome: 'Canal da OSC', url: 'https://example.org/canal', ativo: false, icone: '/uploads/rede.png' },
    alteracoes: { nome: 'Canal atualizado', url: 'https://example.org/novo', ativo: true }, abrir: (c, o) => c.abrirModal(o) },
  { nome: 'unidades', componente: UnidadesTurmas, servico: UnidadeService, formulario: 'formUnidade', salvar: 'salvar', original: unidade,
    alteracoes: { nome: 'Unidade Nova', endereco: 'Rua das Rosas', telefone: '(16) 98888-8888', email: 'nova@example.org',
      horarioAbertura: '07:30', horarioFechamento: '19:00', idadeMin: 5, idadeMax: 18, corHex: '#008899', diasFuncionamento: ['QUA'] },
    abrir: (c, o) => c.abrirEdicao(o) },
  { nome: 'turmas', componente: UnidadesTurmas, servico: TurmaService, formulario: 'formTurma', salvar: 'salvarTurma',
    original: { id: 1, periodo: 'MANHA', horaInicio: '08:00:00', horaFim: '12:00:00', unidade: { id: 1 } },
    alteracoes: { periodo: 'TARDE', horaInicio: '09:00', horaFim: '13:00' }, preservados: { unidadeId: 1 },
    abrir: (c, o) => { c.unidades = [unidade]; c.abrirEdicaoTurma(o); } },
  { nome: 'colaboradores', componente: ColaboradorComponent, servico: ColaboradorService, formulario: 'formColaborador', salvar: 'salvar',
    original: { id: 1, nomeCompleto: 'Marcos Silva', email: 'marcos@example.org', cpf: '52998224725', endereco: 'Rua das Flores',
      telefone: '16999999999', idPapel: 3, unidades: [{ id: 1 }] },
    alteracoes: { nomeCompleto: 'Marcos Souza', email: 'marcosnovo@example.org', cpf: '123.456.789-00', endereco: 'Rua das Rosas',
      telefone: '(16) 98888-8888', idsUnidades: [2] }, preservados: { idsUnidades: [1] }, abrir: (c, o) => c.abrirEdicao(o) },
  { nome: 'meu perfil', componente: Perfil, servico: PerfilService, formulario: 'formDados', salvar: 'salvar', indiceDto: 0,
    original: { id: 1, nomeCompleto: 'Maria Silva', endereco: 'Rua das Flores', telefone: '16999999999', email: 'maria@example.org' },
    alteracoes: { nomeCompleto: 'Maria Souza', endereco: 'Rua das Rosas', telefone: '(16) 98888-8888' },
    abrir: c => { c.carregarPerfil(); c.habilitarEdicao(); } },
  { nome: 'transparência / seções', componente: Transparencia, servico: TransparenciaService, metodo: 'atualizarSecao', formulario: 'formSecao', salvar: 'salvarSecao',
    original: { id: 1, titulo: 'Relatórios', conteudo: 'Conteúdo original', ativo: false },
    alteracoes: { titulo: 'Balanços', conteudo: 'Conteúdo atualizado', ativo: true }, abrir: (c, o) => c.abrirModal('secao', o) },
  { nome: 'conheça a OSC / história', componente: Sobre, servico: SobreService, metodo: 'atualizarSecao', formulario: 'formHistoria', salvar: 'salvarHistoria',
    original: { id: 1, titulo: '2000', conteudo: 'Fundação da instituição', ativo: false, imagem: '/uploads/historia.png' },
    alteracoes: { titulo: '2001', conteudo: 'História atualizada', ativo: true }, abrir: (c, o) => c.abrirModalHistoria(o) },
  ...CAPTACAO_RECURSOS_CONFIG.flatMap(config => config.grupos.map(grupo => ({
    nome: `${config.secao} / ${grupo.grupo}`, componente: CaptacaoRecursos, servico: SecoesGrupoService,
    formulario: 'form', salvar: 'salvar', indiceDto: 2,
    original: { id: 1, grupo: grupo.grupo, titulo: grupo.grupo === 'telefone' ? '16999999999' : 'Produto original',
      conteudo: grupo.grupo === 'telefone' ? '1633334444' : grupo.grupo === 'pix' ? 'doacao@example.org' : 'Conteúdo original',
      ativo: false, imagem: '/uploads/secao.png' },
    alteracoes: Object.fromEntries([
      ...grupo.campos.map(campo => [campo.campo, campo.tipo === 'telefone' ? '16988888888'
          : campo.tipo === 'telefoneOuEmail' ? 'novo@example.org'
        : grupo.grupo === 'pix' ? 'novadoacao@example.org' : 'Informação atualizada']),
      ...(grupo.controlaAtivo ? [['ativo', true]] : [])
    ]),
    abrir: (c: any, o: any) => { c.config = { ...config, grupos: [grupo] }; c.ngOnInit(); c.abrirModal(o); }
  })))
];

function normalizar(campo: string, valor: any): any {
  if (['cpf', 'telefone'].includes(campo)) return String(valor ?? '').replace(/\D/g, '');
  if (campo === 'dataEvento') return String(valor).slice(0, 16);
  if (['horaInicio', 'horaFim', 'horarioAbertura', 'horarioFechamento'].includes(campo)) return String(valor).slice(0, 5);
  if (campo === 'diasFuncionamento') return Array.isArray(valor) ? valor.join(';') : valor;
  return valor;
}

describe.each(casos)('Persistência de campos independentes: $nome', caso => {
  afterEach(() => vi.restoreAllMocks());

  it.each(Object.entries(caso.alteracoes))('editar %s preserva os outros campos', (campo, novo) => {
    vi.spyOn(caso.componente.prototype, 'ngOnInit').mockImplementation(() => {});
    const salvar = vi.fn((...args: any[]) => ['parceiros', 'redes sociais'].includes(caso.nome) ? new Promise(() => {}) : NEVER);
    const servico = {
      [caso.metodo ?? 'atualizar']: salvar,
      buscarPorId: () => of(caso.original), fotoUrl: () => '', buscarMeuPerfil: () => of(caso.original),
      listarPorGrupo: () => of([caso.original]),
      listarPorGrupoPaginado: () => of({ content: [caso.original], page: { number: 0, size: 10, totalElements: 1, totalPages: 1 } })
    };
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideRouter([]),
        { provide: caso.servico, useValue: servico },
        { provide: Auth, useValue: { hasRole: () => true } },
        { provide: SessaoService, useValue: { membro: () => ({ id: 99 }), isAdministrador: () => true,
          isCoordenador: () => false, isMonitor: () => false, podeGerenciarColaborador: () => true } },
        { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }
      ]
    });
    TestBed.overrideComponent(caso.componente, { set: { template: '' } });
    const fixture = TestBed.createComponent(caso.componente);
    const componente = fixture.componentInstance;
    if (caso.componente === CaptacaoRecursos) {
      vi.mocked(caso.componente.prototype.ngOnInit).mockRestore();
    }
    caso.abrir(componente, caso.original);
    const form = componente[caso.formulario];
    form.get(campo).setValue(novo);
    form.get(campo).markAsDirty();
    expect(form.valid, JSON.stringify(form.errors)).toBe(true);
    void componente[caso.salvar]();
    expect(salvar).toHaveBeenCalledOnce();
    const dto = salvar.mock.calls[0][caso.indiceDto ?? 1] as Record<string, any>;
    const esperados = { ...Object.fromEntries(Object.keys(caso.alteracoes)
      .filter(chave => chave in caso.original).map(chave => [chave, caso.original[chave]])), ...caso.preservados, [campo]: novo };
    for (const [chave, esperado] of Object.entries(esperados)) {
      expect(normalizar(chave, dto[chave]), `Campo ${chave} ao editar ${campo}`).toEqual(normalizar(chave, esperado));
    }
  });
});

const ficha = {
  tipoMoradia: 'PROPRIA', valorAluguel: null, valorFinanciamento: null,
  despesaEnergia: null, despesaAgua: 25, despesaInternet: null, despesaTelefone: null,
  despesaMercado: null, despesaFarmacia: null, despesaFinanciamentos: null, despesaOutras: null,
  utilizaCarro: false, gastoCarro: null, utilizaMoto: false, gastoMoto: null,
  utilizaTransportePublico: false, gastoTransportePublico: null, utilizaVan: false, gastoVan: null,
  andandoOuBicicleta: false, religiao: '', possuiProblemaSaude: true, descProblemaSaude: 'Asma',
  usaMedicacao: true, descMedicacao: 'Medicação original', temAlergia: true, descAlergia: 'Poeira'
};
const usuario = {
  id: 1, nomeCompleto: 'Arthur Silva Gomes', dataNascimento: '2015-05-10', cpf: '52998224725',
  documentoAuxiliar: 'CERTIDAO-123', tipoDocumento: 'CERTIDAO_NASCIMENTO',
  endereco: 'Rua das Flores', bairro: 'Centro', escola: 'Escola de teste', periodoEscolar: 'MANHA', serieEscolar: 'SERIE_4',
  cadUnico: '', cep: '', raEscolar: '', idTurma: 1, fichaSocioeconomica: ficha,
  contatos: [{ id: 1, nomeCompleto: 'Responsável', telefone: '16999991111', principal: true }],
  composicaoFamiliar: [{ id: 12, nomeCompleto: 'Ana Silva', parentescoVinculo: 'MAE', escolaridade: 'MEDIO_COMPLETO',
    idade: null, renda: null, beneficios: null }]
};

const abasUsuario = [
  { nome: 'dados pessoais', componente: UsuarioPerfilDadosPessoais, campos: {
    nomeCompleto: 'Arthur Silva GomesAL', dataNascimento: '2015-05-11', cadUnico: '1200345',
    bairro: 'Jardim', endereco: 'Rua das Rosas', escola: 'Escola atualizada', periodoEscolar: 'TARDE', serieEscolar: 'SERIE_5', raEscolar: '987654'
  } },
  { nome: 'dados socioeconômicos', componente: UsuarioPerfilDadosSocioeconomicos, campos: {
    despesaAgua: 30, despesaEnergia: 20, despesaInternet: 30, despesaTelefone: 40, despesaMercado: 50,
    despesaFarmacia: 60, despesaFinanciamentos: 70, despesaOutras: 80, andandoOuBicicleta: true
  } },
  { nome: 'saúde', componente: UsuarioPerfilSaude, campos: {
    descProblemaSaude: 'Asma atualizada', descMedicacao: 'Medicação atualizada', descAlergia: 'Alergia atualizada'
  } }
];

describe.each(abasUsuario)('Preservação no perfil do usuário: $nome', aba => {
  it.each(Object.entries(aba.campos))('editar %s mantém os demais dados e os familiares', (campo, novo) => {
    const atualizar = vi.fn((...args: any[]) => NEVER);
    TestBed.configureTestingModule({ providers: [
      { provide: UsuarioService, useValue: { atualizar, listarArquivosSaude: () => of([]) } },
      { provide: CepService, useValue: { consultar: () => of(null) } },
      { provide: ToastrService, useValue: { error: vi.fn(), success: vi.fn() } }
    ] });
    TestBed.overrideComponent(aba.componente, { set: { template: '' } });
    const fixture = TestBed.createComponent(aba.componente as Type<any>);
    const componente = fixture.componentInstance as any;
    fixture.componentRef.setInput('usuario', usuario);
    fixture.detectChanges();
    componente.editar();
    componente.form.get(campo).setValue(novo);
    componente.salvar();
    expect(atualizar).toHaveBeenCalledOnce();
    const dto = atualizar.mock.calls[0][1];
    expect(dto).toMatchObject({ cpf: usuario.cpf, documentoAuxiliar: usuario.documentoAuxiliar,
      tipoDocumento: usuario.tipoDocumento, nomeCompleto: campo === 'nomeCompleto' ? novo : usuario.nomeCompleto });
    if (aba.nome !== 'dados pessoais') {
      const esperado = { ...ficha, [campo]: novo };
      for (const [chave, valor] of Object.entries(esperado)) {
        expect(dto.fichaSocioeconomica[chave] ?? null, `Campo ${chave} ao editar ${campo}`).toEqual(valor);
      }
    }
    if (aba.nome === 'dados socioeconômicos') expect(dto.composicaoFamiliar).toEqual(usuario.composicaoFamiliar);
  });
});


describe('Preservação dos familiares no perfil', () => {
  it.each(Object.entries({ nomeCompleto: 'Ana Atualizada', idade: 40, parentescoVinculo: 'TIA',
    escolaridade: 'SUPERIOR_COMPLETO', renda: 1200, beneficios: 100 }))(
    'editar %s preserva os outros campos nulos e o identificador', (campo, novo) => {
      const atualizar = vi.fn((...args: any[]) => NEVER);
      TestBed.configureTestingModule({ providers: [
        { provide: UsuarioService, useValue: { atualizar } },
        { provide: ToastrService, useValue: { error: vi.fn(), success: vi.fn() } }
      ] });
      TestBed.overrideComponent(UsuarioPerfilDadosSocioeconomicos, { set: { template: '' } });
      const fixture = TestBed.createComponent(UsuarioPerfilDadosSocioeconomicos);
      fixture.componentRef.setInput('usuario', usuario);
      fixture.detectChanges();
      const componente = fixture.componentInstance;
      componente.editar();
      componente.familiaresArray.at(0).get(campo)!.setValue(novo);
      componente.salvar();

      expect(atualizar).toHaveBeenCalledOnce();
      const dto = atualizar.mock.calls[0][1];
      expect(dto.composicaoFamiliar).toEqual([{ ...usuario.composicaoFamiliar[0], [campo]: novo }]);
      expect(dto.fichaSocioeconomica).toEqual(ficha);
    }
  );
});
