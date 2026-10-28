import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, tap, throwError } from 'rxjs';
import { vi } from 'vitest';
import { Auth } from '../../shared/services/auth/auth';
import { HistoricoService } from '../../shared/services/historico/historico.service';
import { AtividadeHistorico } from '../../shared/models/historico.model';
import { HistoricoContextual } from './historico-contextual';

const atividade: AtividadeHistorico = {
  evento: {
    id: 10, revisao: 1, dataHora: '2026-10-22T12:00:00-03:00', idResponsavel: 3,
    nomeResponsavel: 'Ana', tipoRegistro: 'USUARIOS', informacaoAlterada: 'Usuário',
    idRegistro: 4, identificacaoRegistro: 'Maria', registroExcluido: false, tipoAlteracao: 'EDICAO'
  },
  resumo: 'Ana alterou telefone.', registros: []
};
atividade.registros = [atividade.evento];

describe('Novidades no histórico contextual', () => {
  let componente: HistoricoContextual;
  let atualizacoes: Subject<void>;
  let servico: {
    atualizacoes: Subject<void>;
    consultarLeitura: ReturnType<typeof vi.fn>;
    atividades: ReturnType<typeof vi.fn>;
    marcarLido: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    atualizacoes = new Subject<void>();
    servico = {
      atualizacoes,
      consultarLeitura: vi.fn().mockReturnValue(of({ ultimoEvento: 10, ultimoLido: 0, temNovidades: true })),
      atividades: vi.fn().mockReturnValue(of({ content: [atividade] })),
      marcarLido: vi.fn().mockReturnValue(of(undefined))
    };
    await TestBed.configureTestingModule({
      imports: [HistoricoContextual],
      providers: [provideRouter([]),
        { provide: Auth, useValue: { podeAcessar: () => true } },
        { provide: HistoricoService, useValue: servico }]
    }).compileComponents();
    componente = TestBed.createComponent(HistoricoContextual).componentInstance;
    componente.tipo = 'USUARIOS';
    componente.idRegistro = 4;
    componente.ngOnInit();
  });

  afterEach(() => componente.ngOnDestroy());

  it('oculta o acesso quando não há registros no contexto', () => {
    servico.consultarLeitura.mockReturnValue(of({ ultimoEvento: 0, ultimoLido: 0, temNovidades: false }));
    atualizacoes.next();
    expect(componente.temRegistros).toBe(false);
  });

  it('mantém o acesso aos registros que já foram lidos', () => {
    servico.consultarLeitura.mockReturnValue(of({ ultimoEvento: 10, ultimoLido: 10, temNovidades: false }));
    atualizacoes.next();
    expect(componente.temRegistros).toBe(true);
    expect(componente.temNovidades).toBe(false);
  });

  it('exibe o acesso ao diário quando somente ocorrências têm registros', () => {
    componente.diario = true;
    componente.ngOnChanges();
    servico.consultarLeitura.mockImplementation(tipo => of({
      ultimoEvento: tipo === 'OCORRENCIAS' ? 10 : 0, ultimoLido: 10, temNovidades: false
    }));
    atualizacoes.next();
    expect(componente.temRegistros).toBe(true);
  });

  it('oculta o acesso anterior ao trocar de contexto', () => {
    atualizacoes.next();
    expect(componente.temRegistros).toBe(true);
    componente.idRegistro = 5;
    componente.ngOnChanges();
    expect(componente.temRegistros).toBe(false);
  });

  it('acende a bolinha quando uma atualização encontra eventos não lidos', () => {
    servico.consultarLeitura.mockReturnValueOnce(of({ temNovidades: false }));
    atualizacoes.next();
    expect(componente.temNovidades).toBe(false);
    atualizacoes.next();
    expect(componente.temNovidades).toBe(true);
  });

  it('marca apenas eventos apresentados e apaga após confirmar a leitura', () => {
    atualizacoes.next();
    servico.marcarLido.mockReturnValue(of(undefined).pipe(tap(() => {
      servico.consultarLeitura.mockReturnValue(of({ ultimoEvento: 10, ultimoLido: 10, temNovidades: false }));
      atualizacoes.next();
    })));
    componente.abrir();
    expect(servico.marcarLido).toHaveBeenCalledWith('USUARIOS', expect.objectContaining({ idRegistro: 4 }), 10);
    expect(componente.temNovidades).toBe(false);
  });

  it('mantém a bolinha se falhar a gravação da leitura', () => {
    atualizacoes.next();
    servico.marcarLido.mockReturnValue(throwError(() => new Error('Falha de rede')));
    componente.abrir();
    expect(componente.temNovidades).toBe(true);
    expect(componente.erroLeitura).toBe(true);
  });

  it('mantém o aviso do diário enquanto a outra aba ainda tem novidades', () => {
    componente.diario = true;
    componente.ngOnChanges();
    servico.consultarLeitura.mockImplementation(tipo => of({ temNovidades: tipo === 'OCORRENCIAS' }));
    atualizacoes.next();
    expect(componente.novidadesPresencas).toBe(false);
    expect(componente.novidadesOcorrencias).toBe(true);
    expect(componente.temNovidades).toBe(true);
  });
});
