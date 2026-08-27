import { Component } from '@angular/core';
import { ModalLayout } from '@components/modal-layout/modal-layout';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';

@Component({
  selector: 'app-transparencia',
  imports: [ModalLayout, MatFormFieldModule, MatInputModule, MatSelect, MatOption],
  templateUrl: './transparencia.html',
  styleUrl: './transparencia.css',
})
export class Transparencia {
  modalAberto: 'documento' | 'secao' | null = null;
  nomeDocumentoSelecionado = '';
  nomeImagemSelecionada = '';

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

  private obterNomeArquivo(event: Event) {
    const input = event.target as HTMLInputElement;
    return input.files?.[0]?.name ?? '';
  }
}
