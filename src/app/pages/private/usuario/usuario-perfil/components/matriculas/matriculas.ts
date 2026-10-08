import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ModalLayout } from '@components/modal-layout/modal-layout';
import { TabelaAcao, TabelaColuna, TabelaLayout } from '@components/tabela-layout/tabela-layout';
import { ToastrService } from 'ngx-toastr';
import { MatriculaHistoricoDTO, UsuarioResponseDTO } from 'src/app/shared/models/usuario.model';
import { UsuarioService } from 'src/app/shared/services/usuario/usuario.service';

@Component({
  selector: 'app-usuario-perfil-matriculas',
  standalone: true,
  imports: [CommonModule, MatIconModule, ModalLayout, TabelaLayout],
  templateUrl: './matriculas.html',
  styleUrl: './matriculas.css'
})
export class UsuarioPerfilMatriculas implements OnChanges {
  private readonly usuarioService = inject(UsuarioService);
  private readonly toastr = inject(ToastrService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  @Input() usuario: UsuarioResponseDTO | null = null;

  matriculas: MatriculaHistoricoDTO[] = [];
  carregando = false;
  erro = false;
  matriculaSelecionada: MatriculaHistoricoDTO | null = null;
  private usuarioCarregadoId: number | null = null;

  readonly colunas: TabelaColuna<MatriculaHistoricoDTO>[] = [
    { chave: 'nomeUnidade', titulo: 'Unidade' },
    { chave: 'periodoTurma', titulo: 'Turma', formatar: valor => this.formatarPeriodo(valor) },
    { chave: 'dataIngresso', titulo: 'Início', formatar: valor => this.formatarData(valor) },
    { chave: 'dataDesligamento', titulo: 'Fim', formatar: (_, linha) => linha.status === 'ATIVO' ? '-' : this.formatarData(linha.dataDesligamento) },
    { chave: 'status', titulo: 'Status', tipo: 'matricula-status', principalMobile: true, formatar: valor => this.formatarStatus(valor) }
  ];

  readonly acoes: TabelaAcao<MatriculaHistoricoDTO>[] = [
    { icone: 'visibility', tooltip: 'Visualizar matrícula', acao: 'visualizar' }
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['usuario']) {
      this.usuarioCarregadoId = null;
      this.carregar();
    }
  }

  carregar(): void {
    if (!this.usuario?.id) return;
    if (this.carregando || this.usuarioCarregadoId === this.usuario.id) return;

    this.carregando = true;
    this.erro = false;
    this.changeDetectorRef.markForCheck();
    this.usuarioService.listarMatriculas(this.usuario.id).subscribe({
      next: matriculas => {
        this.matriculas = matriculas;
        this.usuarioCarregadoId = this.usuario?.id ?? null;
        this.carregando = false;
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.carregando = false;
        this.erro = true;
        this.changeDetectorRef.markForCheck();
        this.toastr.error('Não foi possível carregar o histórico de matrículas.', 'Erro');
      }
    });
  }

  executarAcao(evento: { tipo: string; linha: MatriculaHistoricoDTO }): void {
    if (evento.tipo === 'visualizar') this.matriculaSelecionada = evento.linha;
  }

  fecharModal(): void { this.matriculaSelecionada = null; }

  formatarTurma(matricula: MatriculaHistoricoDTO): string {
    return this.formatarPeriodo(matricula.periodoTurma);
  }

  formatarPeriodo(periodo: string): string { return periodo === 'MANHA' ? 'Manhã' : 'Tarde'; }

  formatarStatus(status: string): string {
    return ({ ATIVO: 'ATIVA', INATIVO: 'TRANSFERIDA', EGRESSO: 'DESLIGADA', EXCLUIDO: 'EXCLUÍDA' } as Record<string, string>)[status] || status;
  }

  classeStatus(status: string): string {
    return `status-matricula--${status.toLowerCase()}`;
  }

  formatarData(valor?: string | null): string {
    if (!valor) return 'Não informado';
    const data = new Date(`${valor.split('T')[0]}T00:00:00`);
    return Number.isNaN(data.getTime()) ? 'Não informado' : new Intl.DateTimeFormat('pt-BR').format(data);
  }
}
