import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ToastrService } from 'ngx-toastr';
import { UsuarioPerfilAcompanhamento } from './acompanhamento';
import { AcompanhamentoEntrevistas } from './entrevistas/entrevistas';
import { AcompanhamentoOcorrencias } from './ocorrencias/ocorrencias';
import { ListaPaginada } from './compartilhado/lista-paginada';
import { AcompanhamentoService, Entrevista } from 'src/app/shared/services/acompanhamento/acompanhamento.service';
import { DiarioService } from 'src/app/shared/services/diario/diario.service';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';
import { UsuarioResponseDTO } from 'src/app/shared/models/usuario.model';
import { PaginaResposta } from 'src/app/shared/models/pagina.model';
import { Alertas } from 'src/app/shared/utils/alerts';
import { By } from '@angular/platform-browser';
import { AcompanhamentoFrequencias } from './frequencias/frequencias';

const vazia = { content: [], page: { number: 0, size: 5, totalPages: 0, totalElements: 0 } };
const usuario = { id: 10 } as UsuarioResponseDTO;
const entrevista: Entrevista = { id: 3, idUsuario: 10, idMembro: 4, nomeResponsavel: 'Autora original',
  dataEntrevista: '2026-10-29T09:30:00', relato: 'Relato original', dataRegistro: '2026-10-28T10:00:00' };

describe('Acompanhamento', () => {
  let perfil: string;
  let service: { ocorrencias: ReturnType<typeof vi.fn>; entrevistas: ReturnType<typeof vi.fn>;
    salvarEntrevista: ReturnType<typeof vi.fn>; excluirEntrevista: ReturnType<typeof vi.fn>;
    frequencias: ReturnType<typeof vi.fn>; matriculasFrequencia: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    perfil = 'ADMINISTRADOR';
    service = { ocorrencias: vi.fn(() => of(vazia)), entrevistas: vi.fn(() => of(vazia)),
      salvarEntrevista: vi.fn(() => of(entrevista)), excluirEntrevista: vi.fn(() => of(undefined)),
      frequencias: vi.fn(() => of({ dataInicio: '2026-01-01', dataFim: '2026-12-31', meses: [], presencas: 0, faltas: 0, totalRegistros: 0 })),
      matriculasFrequencia: vi.fn(() => of([])) };
    TestBed.configureTestingModule({ providers: [
      { provide: AcompanhamentoService, useValue: service },
      { provide: DiarioService, useValue: { atualizarOcorrencia: vi.fn(), deletarOcorrencia: vi.fn(), criarOcorrencia: vi.fn() } },
      { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn() } },
      { provide: SessaoService, useValue: {
        isAdministrador: () => perfil === 'ADMINISTRADOR', isCoordenador: () => perfil === 'COORDENADOR',
        isMonitor: () => perfil === 'MONITOR', membro: () => ({ id: 7, nomeCompleto: 'Colaborador logado' }),
      } },
    ] });
  });
  afterEach(() => vi.restoreAllMocks());

  it('filtros de frequência não refazem as consultas de ocorrências e entrevistas', () => {
    const fixture = TestBed.createComponent(UsuarioPerfilAcompanhamento);
    fixture.componentRef.setInput('usuario', usuario); fixture.detectChanges();
    const frequencias = fixture.debugElement.query(By.directive(AcompanhamentoFrequencias)).componentInstance as AcompanhamentoFrequencias;
    const chamadasOcorrencias = service.ocorrencias.mock.calls.length;
    const chamadasEntrevistas = service.entrevistas.mock.calls.length;
    frequencias.form.controls.periodo.setValue('MES_PASSADO'); frequencias.alterarPeriodo();
    expect(service.frequencias).toHaveBeenCalledTimes(2);
    expect(service.ocorrencias).toHaveBeenCalledTimes(chamadasOcorrencias);
    expect(service.entrevistas).toHaveBeenCalledTimes(chamadasEntrevistas);
  });

  it('monitor não renderiza nem consulta entrevistas', () => {
    perfil = 'MONITOR';
    const fixture = TestBed.createComponent(UsuarioPerfilAcompanhamento);
    fixture.componentRef.setInput('usuario', usuario); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-acompanhamento-entrevistas')).toBeNull();
    expect(service.entrevistas).not.toHaveBeenCalled();
    expect(service.ocorrencias).toHaveBeenCalledWith(10, 0, 5, '');
  });

  it('coordenador consulta as duas tabelas e a busca de uma não altera a outra', () => {
    perfil = 'COORDENADOR';
    const fixture = TestBed.createComponent(UsuarioPerfilAcompanhamento);
    fixture.componentRef.setInput('usuario', usuario); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-paginacao').length).toBe(2);
    expect(service.entrevistas).toHaveBeenCalledWith(10, 0, 5, '');
    expect(service.ocorrencias).toHaveBeenCalledTimes(1);
  });

  it('cadastro de entrevista mostra o colaborador logado e envia data, horário e relato', () => {
    const fixture = TestBed.createComponent(AcompanhamentoEntrevistas);
    fixture.componentRef.setInput('usuario', usuario); fixture.detectChanges();
    const c = fixture.componentInstance; c.abrir('NOVO'); fixture.detectChanges();
    const responsavel = fixture.nativeElement.querySelector('input[disabled]') as HTMLInputElement;
    expect(responsavel.value).toBe('Colaborador logado');
    expect(responsavel.disabled).toBe(true);
    c.form.setValue({ data: '2026-10-29', horario: '09:30', relato: ' Novo relato ' });
    c.salvar();
    expect(service.salvarEntrevista).toHaveBeenCalledWith(10, null, {
      dataEntrevista: '2026-10-29T09:30:00', relato: 'Novo relato',
    });
    expect(c.modal()).toBeNull();
  });

  it('edição conserva o autor original e falha no envio mantém os dados', () => {
    service.salvarEntrevista.mockReturnValue(throwError(() => new Error('Falha')));
    const fixture = TestBed.createComponent(AcompanhamentoEntrevistas);
    fixture.componentRef.setInput('usuario', usuario); fixture.detectChanges();
    const c = fixture.componentInstance; c.abrir('EDITAR', entrevista);
    expect(c.responsavel).toBe('Autora original');
    c.form.controls.relato.setValue('Relato corrigido'); c.salvar();
    expect(c.modal()).toBe('EDITAR'); expect(c.temAlteracoes).toBe(true);
    expect(c.form.controls.relato.value).toBe('Relato corrigido'); expect(c.erro()).not.toBe('');
  });

  it('entrevista resume as colunas e mantém descrição completa e autoria no modal', () => {
    const registro = { ...entrevista, relato: 'Descrição completa da entrevista. '.repeat(10) };
    service.entrevistas.mockReturnValue(of({ ...vazia, content: [registro] }));
    const fixture = TestBed.createComponent(AcompanhamentoEntrevistas);
    fixture.componentRef.setInput('usuario', usuario); fixture.detectChanges();
    const cabecalhos = Array.from(fixture.nativeElement.querySelectorAll('th') as NodeListOf<HTMLElement>).map(e => e.textContent?.trim());
    expect(cabecalhos).toEqual(['Data da entrevista', 'Descrição', '']);
    expect(fixture.nativeElement.textContent).toContain('29/10/2026 às 09h30');
    fixture.componentInstance.abrir('VER', registro); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.subtitulos-modal').textContent).toContain('Registrado por Autora original em 28/10/2026 às 10h00');
    expect(fixture.nativeElement.querySelector('.detalhes').textContent).toContain(registro.relato);
  });

  it('ocorrência mostra somente data, tipo e descrição fora e todos os dados no modal', () => {
    const registro = { id: 1, idMatricula: 2, dataOcorrencia: '2026-10-29T09:00:00', dataCriacao: '2026-10-29T10:26:00',
      idMembro: 7, nomeMembro: 'Autor da ocorrência', tipoOcorrencia: 'OUTRO' as const,
      descricao: 'Descrição completa. '.repeat(12), turmaUnidade: 'Manhã — Sede' };
    service.ocorrencias.mockReturnValue(of({ ...vazia, content: [registro] }));
    const fixture = TestBed.createComponent(AcompanhamentoOcorrencias);
    fixture.componentRef.setInput('usuario', usuario); fixture.detectChanges();
    const cabecalhos = Array.from(fixture.nativeElement.querySelectorAll('th') as NodeListOf<HTMLElement>).map(e => e.textContent?.trim());
    expect(cabecalhos).toEqual(['Data da ocorrência', 'Tipo', 'Descrição', '']);
    fixture.componentInstance.abrir('VER', registro); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.subtitulos-modal').textContent).toContain('Registrado por Autor da ocorrência em 29/10/2026 às 10h26');
    expect(fixture.nativeElement.querySelector('.detalhes').textContent).toContain('Manhã — Sede');
    expect(fixture.nativeElement.querySelector('.detalhes').textContent).toContain(registro.descricao);
  });

  for (const componente of [AcompanhamentoEntrevistas, AcompanhamentoOcorrencias]) {
    it(`o relógio abre o seletor de hora em ${componente.name}`, () => {
      const fixture = componente === AcompanhamentoEntrevistas
        ? TestBed.createComponent(AcompanhamentoEntrevistas) : TestBed.createComponent(AcompanhamentoOcorrencias);
      fixture.componentRef.setInput('usuario', usuario); fixture.detectChanges();
      fixture.componentInstance.abrir('NOVO'); fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input[type="time"]') as HTMLInputElement;
      const abrir = vi.fn(); Object.defineProperty(input, 'showPicker', { value: abrir, configurable: true });
      fixture.nativeElement.querySelector('button[aria-label="Selecionar hora"]').click();
      expect(abrir).toHaveBeenCalledOnce();
      input.disabled = true; fixture.componentInstance.abrirSeletorHora(input);
      expect(abrir).toHaveBeenCalledTimes(1);
    });
  }

  it('não envia relato vazio nem fecha formulário se o descarte for recusado', async () => {
    const fixture = TestBed.createComponent(AcompanhamentoEntrevistas);
    fixture.componentRef.setInput('usuario', usuario); fixture.detectChanges();
    const c = fixture.componentInstance; c.abrir('NOVO');
    c.form.setValue({ data: '2026-10-29', horario: '09:30', relato: '   ' }); c.salvar();
    expect(service.salvarEntrevista).not.toHaveBeenCalled();
    vi.spyOn(Alertas, 'confirmarDescarte').mockResolvedValue(false);
    await c.fechar(); expect(c.modal()).toBe('NOVO');
  });

  it('bloqueia data ou horário futuro no cadastro e na edição, mas permite o minuto atual em Brasília', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-29T12:00:30-03:00'));
    const fixture = TestBed.createComponent(AcompanhamentoEntrevistas);
    fixture.componentRef.setInput('usuario', usuario); fixture.detectChanges();
    const c = fixture.componentInstance;
    for (const modo of ['NOVO', 'EDITAR'] as const) {
      c.abrir(modo, modo === 'EDITAR' ? entrevista : null);
      for (const dados of [
        { data: '2026-10-30', horario: '09:00', relato: 'Relato' },
        { data: '2026-10-29', horario: '12:01', relato: 'Relato' },
      ]) {
        c.form.setValue(dados); c.salvar(); fixture.detectChanges();
        expect(service.salvarEntrevista).not.toHaveBeenCalled();
        expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('futuro');
      }
    }
    c.form.setValue({ data: '2026-10-29', horario: '12:00', relato: 'Relato' }); c.salvar();
    expect(service.salvarEntrevista).toHaveBeenCalledOnce();
  });

  it('monitor só altera ocorrência própria dentro de 24 horas; coordenador altera de outro autor', () => {
    const fixture = TestBed.createComponent(AcompanhamentoOcorrencias);
    const c = fixture.componentInstance;
    const agora = Date.parse('2026-10-29T12:00:00-03:00'); vi.spyOn(Date, 'now').mockReturnValue(agora);
    const oc = { id: 1, idMatricula: 2, dataOcorrencia: '2026-10-29T09:00:00', dataCriacao: '2026-10-28T12:00:00',
      idMembro: 7, nomeMembro: 'Autor', tipoOcorrencia: 'OUTRO' as const, descricao: 'Relato', turmaUnidade: 'Manhã — Sede' };
    perfil = 'MONITOR'; expect(c.podeAlterar(oc)).toBe(true);
    expect(c.podeAlterar({ ...oc, idMembro: 4 })).toBe(false);
    expect(c.podeAlterar({ ...oc, dataCriacao: '2026-10-28T11:59:59' })).toBe(false);
    perfil = 'COORDENADOR'; expect(c.podeAlterar({ ...oc, idMembro: 4 })).toBe(true);
    c.abrir('NOVO'); c.salvar();
    expect(TestBed.inject(DiarioService).criarOcorrencia).not.toHaveBeenCalled();
  });
});

describe('Busca e paginação do acompanhamento', () => {
  it('busca reinicia a página e cancela resultados da consulta anterior', () => {
    const antiga = new Subject<PaginaResposta<string>>(); const nova = new Subject<PaginaResposta<string>>();
    const buscar = vi.fn().mockReturnValueOnce(antiga).mockReturnValueOnce(nova);
    const lista = new ListaPaginada<string>(buscar);
    lista.mudarPagina(2); lista.pesquisar('Ana');
    expect(buscar).toHaveBeenLastCalledWith(0, 5, 'Ana');
    nova.next({ ...vazia, content: ['novo'] }); antiga.next({ ...vazia, content: ['antigo'] });
    expect(lista.dados()).toEqual(['novo']); lista.destruir();
  });

  it('volta à página disponível quando a exclusão esvazia a última página', () => {
    const buscar = vi.fn().mockReturnValueOnce(of({ ...vazia, page: { ...vazia.page, totalPages: 1, totalElements: 5 } }))
      .mockReturnValueOnce(of({ ...vazia, content: ['registro'] }));
    const lista = new ListaPaginada<string>(buscar); lista.mudarPagina(1);
    expect(lista.pagina()).toBe(0); expect(lista.dados()).toEqual(['registro']); lista.destruir();
  });
});
