import { ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Subscription, forkJoin } from 'rxjs';
import { CampoHistorico, HistoricoDetalhe, HistoricoEvento, TipoAlteracaoHistorico, ValorHistorico } from '../../shared/models/historico.model';
import { HistoricoService } from '../../shared/services/historico/historico.service';
import { formatarCep, formatarCpf, formatarTelefone } from '../../shared/utils/masks';
import { DiasFuncionamentoPipe } from '../../shared/pipes/dias-funcionamento.pipe';

@Component({
  selector: 'app-historico-detalhe',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './historico-detalhe.html',
  styleUrl: './historico-detalhe.css'
})
export class HistoricoDetalheComponent implements OnChanges, OnDestroy {
  @Input() registros: HistoricoEvento[] = [];
  private readonly service = inject(HistoricoService);
  private readonly cdr = inject(ChangeDetectorRef);
  private requisicao?: Subscription;
  private readonly moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  private readonly diasFuncionamento = new DiasFuncionamentoPipe();
  private readonly nomesPorCampo: Record<string, Record<string, string>> = {
    escolaridade: {
      ANALFABETO: 'Analfabeto', ALFABETIZADO: 'Alfabetizado',
      FUNDAMENTAL_INCOMPLETO: 'Fundamental incompleto', FUNDAMENTAL_COMPLETO: 'Fundamental completo',
      MEDIO_INCOMPLETO: 'Médio incompleto', MEDIO_COMPLETO: 'Médio completo',
      SUPERIOR_INCOMPLETO: 'Superior incompleto', SUPERIOR_COMPLETO: 'Superior completo',
      POS_GRADUACAO: 'Pós-graduação'
    },
    tipoDocumento: { CERTIDAO_NASCIMENTO: 'Certidão de Nascimento', CRNM_RNE: 'CRNM/RNE', OUTRO: 'Outro' },
    status: { ATIVO: 'Ativo', INATIVO: 'Inativo', EGRESSO: 'Desligado', EXCLUIDO: 'Excluído' },
    periodo: { MANHA: 'Manhã', TARDE: 'Tarde', NOITE: 'Noite', INTEGRAL: 'Integral' },
    papel: { ADMINISTRADOR: 'Administrador', COORDENADOR: 'Coordenador', MONITOR: 'Monitor', COLABORADOR: 'Colaborador' }
  };
  private readonly camposMonetarios = new Set([
    'valor', 'renda', 'beneficios', 'valorAluguel', 'valorFinanciamento',
    'despesaEnergia', 'despesaAgua', 'despesaInternet', 'despesaTelefone',
    'despesaMercado', 'despesaFarmacia', 'despesaFinanciamentos', 'despesaOutras',
    'gastoCarro', 'gastoMoto', 'gastoTransportePublico', 'gastoVan'
  ]);
  detalhes: HistoricoDetalhe[] = [];
  carregando = false;
  erro = false;

  ngOnChanges(): void {
    this.carregar();
  }

  ngOnDestroy(): void {
    this.requisicao?.unsubscribe();
  }

  carregar(): void {
    this.requisicao?.unsubscribe();
    this.detalhes = [];
    if (!this.registros.length) {
      this.carregando = false;
      this.erro = false;
      return;
    }
    this.carregando = true;
    this.erro = false;
    this.requisicao = forkJoin(this.registros.map(registro => this.service.detalhar(registro.id))).subscribe({
      next: detalhes => {
        this.detalhes = detalhes;
        this.carregando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.erro = true;
        this.carregando = false;
        this.cdr.markForCheck();
      }
    });
  }

  campos(detalhe: HistoricoDetalhe): CampoHistorico[] {
    const camposInternos = ['id', 'idUsuario', 'idContato', 'idEvento', 'idRedeSocial', 'grupo'];
    if (detalhe.evento.tipoRegistro === 'PRESENCAS') {
      camposInternos.push('matricula', 'membro', 'dataCriacao');
    }
    if (detalhe.evento.tipoRegistro === 'OCORRENCIAS') {
      camposInternos.push('matricula', 'dataCriacao');
      if (detalhe.evento.tipoAlteracao === 'CADASTRO') camposInternos.push('membro');
    }
    return detalhe.campos.filter(campo => {
      if (camposInternos.includes(campo.campo)) return false;
      const valor = detalhe.evento.tipoAlteracao === 'EXCLUSAO' ? campo.valorAnterior : campo.valorNovo;
      return detalhe.evento.tipoAlteracao === 'EDICAO' || (valor !== null && valor !== '');
    });
  }

  get chamadaRegistrada(): boolean {
    return this.detalhes.length > 0 && this.detalhes.every(detalhe =>
      detalhe.evento.tipoRegistro === 'PRESENCAS' && detalhe.evento.tipoAlteracao === 'CADASTRO');
  }

  alunosPorPresenca(presente: boolean): HistoricoDetalhe[] {
    return this.detalhes.filter(detalhe => detalhe.campos.some(campo =>
      campo.campo === 'presente' && campo.valorNovo === presente));
  }

  nomeAluno(detalhe: HistoricoDetalhe): string {
    const contexto = detalhe.contextoNovo?.['usuario'] ?? detalhe.contextoAnterior?.['usuario'];
    return contexto ? this.formatar(contexto) : detalhe.evento.identificacaoRegistro;
  }

  nomeVinculo(detalhe: HistoricoDetalhe, campo: 'usuario' | 'contato'): string {
    const contexto = detalhe.contextoNovo?.[campo] ?? detalhe.contextoAnterior?.[campo];
    return contexto ? this.formatar(contexto) : 'Nome indisponível neste registro';
  }

  get registroPrincipal(): string {
    if (!this.chamadaRegistrada) return this.registros[0].identificacaoRegistro;
    const detalhe = this.detalhes[0];
    const turma = detalhe.contextoNovo?.['turma'];
    const data = detalhe.campos.find(campo => campo.campo === 'dataRegistro')?.valorNovo;
    let nomeTurma = 'Presença';
    if (turma && typeof turma === 'object' && !Array.isArray(turma)) {
      const periodo = String(turma['periodo'] ?? '');
      const periodos: Record<string, string> = { MANHA: 'Manhã', TARDE: 'Tarde', NOITE: 'Noite', INTEGRAL: 'Integral' };
      nomeTurma = [periodos[periodo] ?? periodo, turma['unidade']].filter(Boolean).join(' · ');
    }
    return [nomeTurma, data ? this.formatar(data) : ''].filter(Boolean).join(' · ');
  }

  presenca(detalhe: HistoricoDetalhe, anterior: boolean): string {
    const campo = detalhe.campos.find(item => item.campo === 'presente');
    if (!campo) return 'Não informado';
    if (anterior && !campo.anteriorConhecido) return 'Não disponível';
    const valor = anterior ? campo.valorAnterior : campo.valorNovo;
    return valor === true ? 'Presente' : valor === false ? 'Ausente' : 'Não informado';
  }

  somentePresenca(detalhe: HistoricoDetalhe): boolean {
    const campos = this.campos(detalhe);
    return detalhe.evento.tipoRegistro === 'PRESENCAS' && detalhe.evento.tipoAlteracao === 'EDICAO'
      && campos.length === 1 && campos[0].campo === 'presente';
  }

  nomeAcao(acao: TipoAlteracaoHistorico): string {
    return { CADASTRO: 'Cadastro', EDICAO: 'Edição', EXCLUSAO: 'Exclusão' }[acao];
  }

  tituloSecao(detalhe: HistoricoDetalhe): string {
    const nomesDistintos = new Set(this.registros.map(registro => registro.identificacaoRegistro));
    return nomesDistintos.size > 1
      ? `${detalhe.evento.identificacaoRegistro} · ${detalhe.evento.informacaoAlterada}`
      : detalhe.evento.informacaoAlterada;
  }

  nomeCampo(campo: CampoHistorico): string {
    return campo.nome.replace(/^ID d[oa] /, '').replace(/^./, inicial => inicial.toUpperCase());
  }

  ehArquivo(campo: CampoHistorico): boolean {
    return ['imagem', 'foto', 'logo', 'icone', 'arquivo'].includes(campo.campo);
  }

  alteracaoArquivo(detalhe: HistoricoDetalhe, campo: CampoHistorico): string {
    if (detalhe.evento.tipoAlteracao === 'EXCLUSAO' || !campo.valorNovo) return 'Arquivo removido';
    if (detalhe.evento.tipoAlteracao === 'CADASTRO' || !campo.valorAnterior) return 'Arquivo adicionado';
    return 'Arquivo substituído';
  }

  valor(detalhe: HistoricoDetalhe, campo: CampoHistorico, anterior: boolean): string {
    if (anterior && !campo.anteriorConhecido) {
      return 'Referência anterior indisponível';
    }
    if (anterior && detalhe.evento.tipoAlteracao === 'CADASTRO') {
      return 'Não se aplica';
    }
    if (!anterior && detalhe.evento.tipoAlteracao === 'EXCLUSAO') {
      return 'Registro excluído';
    }
    const valor = anterior ? campo.valorAnterior : campo.valorNovo;
    const contexto = anterior ? detalhe.contextoAnterior : detalhe.contextoNovo;
    if (campo.campo === 'status' && detalhe.evento.informacaoAlterada === 'Matrícula' && typeof valor === 'string') {
      const statusMatricula: Record<string, string> = {
        ATIVO: 'Ativa', INATIVO: 'Transferida', EGRESSO: 'Desligada', EXCLUIDO: 'Excluída'
      };
      return statusMatricula[valor] ?? valor;
    }
    if (['parentesco', 'parentescoVinculo'].includes(campo.campo) && typeof valor === 'string') {
      const parentescos: Record<string, string> = {
        MAE: 'Mãe', PAI: 'Pai', AVO: 'Avô/Avó', IRMAO: 'Irmão/Irmã',
        TIO: 'Tio/Tia', PRIMO: 'Primo/Prima', PADRASTO_MADRASTA: 'Padrasto/Madrasta',
        VIZINHO: 'Vizinho', OUTRO: 'Outro'
      };
      const chave = valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      return parentescos[chave] ?? valor;
    }
    if (campo.campo === 'periodo' && typeof valor === 'string') {
      const periodos: Record<string, string> = { MANHA: 'Manhã', TARDE: 'Tarde', NOITE: 'Noite', INTEGRAL: 'Integral' };
      return periodos[valor] ?? valor;
    }
    if (['horaInicio', 'horaFim', 'horarioAbertura', 'horarioFechamento'].includes(campo.campo)
        && typeof valor === 'string') {
      return valor.slice(0, 5);
    }
    if (campo.campo === 'tipoEvento' && typeof valor === 'string') {
      return ({ ARRECADACAO: 'Arrecadação', CULTURAL: 'Cultural', COMEMORATIVO: 'Comemorativo' } as Record<string, string>)[valor] ?? valor;
    }
    if (campo.campo === 'tipoOcorrencia' && typeof valor === 'string') {
      const nomes: Record<string, string> = {
        COMPORTAMENTO: 'Comportamento', SAUDE: 'Saúde', ASSISTENCIA: 'Assistência', OUTRO: 'Outro'
      };
      return nomes[valor] ?? valor;
    }
    if (['usuario', 'contato', 'turma', 'membro', 'papel', 'matricula', 'pagina', 'secao', 'evento', 'redeSocial', 'unidade'].includes(campo.campo)) {
      const referencia = campo.campo === 'membro' ? 'autorOriginal' : campo.campo;
      const informacao = contexto?.[referencia];
      if (informacao) {
        return this.formatar(informacao, campo.campo);
      }
      return valor == null ? 'Sem vínculo' : 'Nome do vínculo indisponível neste registro';
    }
    return this.formatarCampo(detalhe, campo, valor);
  }

  private formatarCampo(detalhe: HistoricoDetalhe, campo: CampoHistorico, valor: ValorHistorico): string {
    if (valor === null || valor === '' || (typeof valor !== 'string' && typeof valor !== 'number')) {
      return this.formatar(valor, campo.campo);
    }

    const texto = String(valor);
    const numeros = texto.replace(/\D/g, '');
    const contatoGrafica = detalhe.evento.tipoRegistro === 'GRAFICA'
      && detalhe.evento.informacaoAlterada === 'Contato da gráfica'
      && ['titulo', 'conteudo'].includes(campo.campo);
    const telefone = campo.campo === 'telefone' || contatoGrafica;

    if (telefone && /^[\d\s()+.\-]+$/.test(texto) && [10, 11].includes(numeros.length)) {
      return formatarTelefone(texto);
    }
    if (campo.campo === 'cpf' && /^[\d.\-\s]+$/.test(texto) && numeros.length === 11) {
      return formatarCpf(texto);
    }
    if (campo.campo === 'cep' && /^[\d\-\s]+$/.test(texto) && numeros.length === 8) {
      return formatarCep(texto);
    }
    if (this.camposMonetarios.has(campo.campo) && texto.trim() !== '' && Number.isFinite(Number(valor))) {
      return this.moeda.format(Number(valor));
    }
    return this.formatar(valor, campo.campo);
  }

  private formatar(valor: ValorHistorico, campo = ''): string {
    if (valor === null || valor === '') {
      return '-';
    }
    if (campo === 'diasFuncionamento' && typeof valor === 'string') {
      return this.diasFuncionamento.transform(valor);
    }
    if (typeof valor === 'boolean') {
      if (campo === 'ativo') return valor ? 'Ativo' : 'Inativo';
      if (campo === 'presente') return valor ? 'Presente' : 'Ausente';
      return valor ? 'Sim' : 'Não';
    }
    if (typeof valor === 'string' && this.nomesPorCampo[campo]) {
      return this.nomesPorCampo[campo][valor] ?? valor;
    }
    if (Array.isArray(valor)) {
      return valor.map(item => this.formatar(item, campo)).join(', ') || 'Nenhum';
    }
    if (typeof valor === 'object') {
      const nome = valor['nome'] ?? valor['titulo'] ?? valor['nomeCompleto'] ?? valor['nome_completo'];
      if (nome) {
        return this.formatar(nome, campo);
      }
      return Object.entries(valor)
        .filter(([chave]) => chave !== 'id' && !chave.startsWith('id_'))
        .map(([chave, conteudo]) => this.formatar(conteudo, chave)).join(', ') || 'Vínculo registrado';
    }
    if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      return valor.split('-').reverse().join('/');
    }
    if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(valor)) {
      const [data, hora] = valor.split('T');
      return `${data.split('-').reverse().join('/')}, ${hora.slice(0, 5)}`;
    }
    return String(valor);
  }
}
