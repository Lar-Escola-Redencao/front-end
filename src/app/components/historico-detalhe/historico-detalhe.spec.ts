import { TestBed } from '@angular/core/testing';
import { HistoricoDetalheComponent } from './historico-detalhe';
import { HistoricoService } from '../../shared/services/historico/historico.service';
import { CampoHistorico, HistoricoDetalhe, ValorHistorico } from '../../shared/models/historico.model';

describe('Exibição dos valores no histórico', () => {
  let componente: HistoricoDetalheComponent;
  const detalhe = { evento: { tipoRegistro: 'UNIDADES', tipoAlteracao: 'EDICAO' },
    contextoAnterior: {}, contextoNovo: {} } as HistoricoDetalhe;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: HistoricoService, useValue: {} }] });
    componente = TestBed.createComponent(HistoricoDetalheComponent).componentInstance;
  });

  for (const [campo, anterior, novo, antes, depois] of [
    ['diasFuncionamento', 'SEG;TER;QUA', 'SEG;TER;QUA;QUI;SEX', 'Segunda, Terça e Quarta', 'Segunda a Sexta'],
    ['ativo', true, false, 'Ativo', 'Inativo'],
    ['presente', false, true, 'Ausente', 'Presente'],
    ['principal', false, true, 'Não', 'Sim'],
    ['escolaridade', 'MEDIO_INCOMPLETO', 'POS_GRADUACAO', 'Médio incompleto', 'Pós-graduação'],
    ['tipoDocumento', 'CERTIDAO_NASCIMENTO', 'CRNM_RNE', 'Certidão de Nascimento', 'CRNM/RNE'],
    ['periodo', 'MANHA', 'TARDE', 'Manhã', 'Tarde'],
    ['parentesco', 'MAE', 'AVO', 'Mãe', 'Avô/Avó'],
    ['tipoEvento', 'ARRECADACAO', 'CULTURAL', 'Arrecadação', 'Cultural'],
    ['tipoOcorrencia', 'SAUDE', 'ASSISTENCIA', 'Saúde', 'Assistência'],
    ['horarioAbertura', '08:00:00', '09:30:00', '08:00', '09:30'],
    ['cpf', '12345678901', '98765432100', '123.456.789-01', '987.654.321-00'],
    ['telefone', '11987654321', '1133334444', '(11) 98765-4321', '(11) 3333-4444'],
    ['cep', '12345678', '87654321', '12345-678', '87654-321'],
    ['dataNascimento', '2020-01-02', '2020-02-03', '02/01/2020', '03/02/2020'],
    ['endereco', null, 'Rua A', '-', 'Rua A']
  ] as [string, ValorHistorico, ValorHistorico, string, string][]) {
    it(`formata os valores anterior e novo de ${campo}`, () => {
      const alteracao: CampoHistorico = { campo, nome: campo, valorAnterior: anterior,
        valorNovo: novo, anteriorConhecido: true };
      expect(componente.valor(detalhe, alteracao, true)).toBe(antes);
      expect(componente.valor(detalhe, alteracao, false)).toBe(depois);
    });
  }

  it('formata período e perfil nas referências sem mostrar IDs técnicos', () => {
    const dados = { ...detalhe, contextoNovo: {
      turma: { periodo: 'MANHA', id_unidade: 4, unidade: 'Sede' }, papel: { nome: 'COORDENADOR' }
    } };
    const campo: CampoHistorico = { campo: 'turma', nome: 'Turma', valorAnterior: null,
      valorNovo: 7, anteriorConhecido: false };
    expect(componente.valor(dados, campo, false)).toBe('Manhã, Sede');
    expect(componente.valor(dados, { ...campo, campo: 'papel' }, false)).toBe('Coordenador');
    expect(componente.valor(dados, campo, true)).toBe('Referência anterior indisponível');
  });

  it('distingue transferência, desligamento e exclusão no status da matrícula', () => {
    const dados = { ...detalhe, evento: { ...detalhe.evento, tipoRegistro: 'USUARIOS' as const,
      informacaoAlterada: 'Matrícula' } };
    const status: CampoHistorico = { campo: 'status', nome: 'Status', valorAnterior: 'ATIVO',
      valorNovo: 'INATIVO', anteriorConhecido: true };
    expect(componente.valor(dados, status, true)).toBe('Ativa');
    expect(componente.valor(dados, status, false)).toBe('Transferida');
    expect(componente.valor(dados, { ...status, valorNovo: 'EGRESSO' }, false)).toBe('Desligada');
    expect(componente.valor(dados, { ...status, valorNovo: 'EXCLUIDO' }, false)).toBe('Excluída');
  });

  it('usa os nomes da turma anterior e da nova turma ao transferir', () => {
    const dados = { ...detalhe, contextoAnterior: { turma: { periodo: 'MANHA', unidade: 'Sede' } },
      contextoNovo: { turma: { periodo: 'TARDE', unidade: 'Centro' } } };
    const campo: CampoHistorico = { campo: 'turma', nome: 'Turma', valorAnterior: 1,
      valorNovo: 2, anteriorConhecido: true };
    expect(componente.valor(dados, campo, true)).toBe('Manhã, Sede');
    expect(componente.valor(dados, campo, false)).toBe('Tarde, Centro');
  });

  it('exibe os valores e vínculos anteriores numa exclusão', () => {
    const dados = { ...detalhe, evento: { ...detalhe.evento, tipoAlteracao: 'EXCLUSAO' as const },
      contextoAnterior: { turma: { periodo: 'MANHA', unidade: 'Sede' } } };
    const campo: CampoHistorico = { campo: 'turma', nome: 'Turma', valorAnterior: 1,
      valorNovo: null, anteriorConhecido: true };
    expect(componente.valor(dados, campo, true)).toBe('Manhã, Sede');
    expect(componente.valor(dados, { ...campo, campo: 'diasFuncionamento', valorAnterior: 'SEG;QUA' }, true)).toBe('Segunda e Quarta');
    expect(componente.valor(dados, campo, false)).toBe('Registro excluído');
  });

  it('exibe falta e presença numa correção de chamada e o valor anterior ao excluir', () => {
    const campo: CampoHistorico = { campo: 'presente', nome: 'Presença', valorAnterior: false,
      valorNovo: true, anteriorConhecido: true };
    const dados = { ...detalhe, evento: { ...detalhe.evento, tipoRegistro: 'PRESENCAS' as const }, campos: [campo] };
    expect(componente.somentePresenca(dados)).toBe(true);
    expect(componente.presenca(dados, true)).toBe('Ausente');
    expect(componente.presenca(dados, false)).toBe('Presente');
    const exclusao = { ...dados, evento: { ...dados.evento, tipoAlteracao: 'EXCLUSAO' as const } };
    expect(componente.valor(exclusao, campo, true)).toBe('Ausente');
  });
});
