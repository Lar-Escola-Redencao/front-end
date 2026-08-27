import { Component } from '@angular/core';

import { ModalLayout } from '@components/modal-layout/modal-layout';
import {
  TabelaLayout,
  TabelaColuna,
  TabelaAcao
} from '@components/tabela-layout/tabela-layout';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';

interface DocumentoTransparencia {
  titulo: string;
  secao: string;
  tipo: string;
  dataAtualizacao: string;
}

@Component({
  selector: 'app-transparencia',

  imports: [
    ModalLayout,
    TabelaLayout,

    MatFormFieldModule,
    MatInputModule,
    MatSelect,
    MatOption
  ],

  templateUrl: './transparencia.html',
  styleUrl: './transparencia.css',
})
export class Transparencia {

  modalAberto: 'documento' | 'secao' | null = null;

  nomeDocumentoSelecionado = '';
  nomeImagemSelecionada = '';

  // Dados de teste da tabela
  documentos: DocumentoTransparencia[] = [
    {
      titulo: 'Relatório financeiro 2026',
      secao: 'Prestação de contas',
      tipo: 'PDF',
      dataAtualizacao: '27/08/2026'
    },
    {
      titulo: 'Balanço anual',
      secao: 'Relatórios',
      tipo: 'PDF',
      dataAtualizacao: '20/08/2026'
    },
    {
      titulo: 'Relatório de atividades',
      secao: 'Institucional',
      tipo: 'PDF',
      dataAtualizacao: '15/08/2026'
    },
    {
      titulo: 'Prestação de contas',
      secao: 'Financeiro',
      tipo: 'PDF',
      dataAtualizacao: '10/08/2026'
    }
  ];

  // Define as colunas que a tabela deverá apresentar
  colunas: TabelaColuna<DocumentoTransparencia>[] = [
    {
      chave: 'titulo',
      titulo: 'Documento'
    },
    {
      chave: 'secao',
      titulo: 'Seção',
    },
    {
      chave: 'tipo',
      titulo: 'Tipo',
      principalMobile: true
    },
    {
      chave: 'dataAtualizacao',
      titulo: 'Última atualização'
    }
  ];

  // Define as ações disponíveis em cada linha
  acoes: TabelaAcao<DocumentoTransparencia>[] = [
    {
      icone: 'edit',
      tooltip: 'Editar documento',
      acao: 'editar'
    },
    {
      icone: 'delete',
      tooltip: 'Excluir documento',
      acao: 'excluir'
    }
  ];

  abrirModal(tipo: 'documento' | 'secao') {
    this.modalAberto = tipo;
  }

  fecharModal() {
    this.modalAberto = null;
  }

  selecionarDocumento(event: Event) {
    this.nomeDocumentoSelecionado = this.obterNomeArquivo(event);
  }

  selecionarImagem(event: Event) {
    this.nomeImagemSelecionada = this.obterNomeArquivo(event);
  }

  executarAcao(evento: {
    tipo: string;
    linha: DocumentoTransparencia;
  }) {

    if (evento.tipo === 'editar') {
      console.log('Editar documento:', evento.linha);
    }

    if (evento.tipo === 'excluir') {
      console.log('Excluir documento:', evento.linha);
    }
  }

  private obterNomeArquivo(event: Event) {
    const input = event.target as HTMLInputElement;

    return input.files?.[0]?.name ?? '';
  }
}