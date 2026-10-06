import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TabelaColuna, TabelaLayout } from '@components/tabela-layout/tabela-layout';
import { ContatoResponseDTO } from 'src/app/shared/models/contato.model';
import { UsuarioResponseDTO } from 'src/app/shared/models/usuario.model';
import { formatarTelefone } from 'src/app/shared/utils/masks';

@Component({
  selector: 'app-usuario-perfil-contatos',
  standalone: true,
  imports: [CommonModule, MatIconModule, TabelaLayout],
  templateUrl: './contatos.html',
  styleUrl: './contatos.css'
})
export class UsuarioPerfilContatos {
  @Input() usuario: UsuarioResponseDTO | null = null;

  readonly colunas: TabelaColuna<ContatoResponseDTO>[] = [
    { chave: 'nomeCompleto', titulo: 'Nome do responsável', principalMobile: true },
    { chave: 'telefone', titulo: 'Telefone', formatar: valor => valor ? formatarTelefone(valor) : '-' },
    { chave: 'email', titulo: 'E-mail', formatar: valor => valor || '-' },
    { chave: 'parentesco', titulo: 'Parentesco', formatar: valor => this.formatarParentesco(valor) }
  ];

  get contatos(): ContatoResponseDTO[] {
    return this.usuario?.contatos ?? [];
  }

  adicionarContato(): void {
    // Formulário de inclusão será implementado em etapa futura.
  }

  private formatarParentesco(valor?: string): string {
    const labels: Record<string, string> = {
      MAE: 'Mãe',
      PAI: 'Pai',
      AVO: 'Avô/Avó',
      IRMAO: 'Irmão/Irmã',
      TIO: 'Tio/Tia',
      PRIMO: 'Primo/Prima',
      PADRASTO_MADRASTA: 'Padrasto/Madrasta',
      VIZINHO: 'Vizinho',
      OUTRO: 'Outro'
    };
    return valor ? labels[valor] ?? valor : '-';
  }
}
