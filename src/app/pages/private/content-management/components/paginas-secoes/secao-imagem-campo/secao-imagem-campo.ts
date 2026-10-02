import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';

/**
 * Upload de imagem das seções agrupadas: mostra a imagem já salva e a prévia
 * da nova lado a lado. A validação fica com o formulário de quem usa.
 */
@Component({
  selector: 'app-secao-imagem-campo',
  standalone: true,
  templateUrl: './secao-imagem-campo.html',
  styleUrl: '../paginas-secoes.css',
})
export class SecaoImagemCampo implements OnChanges, OnDestroy {
  @Input({ required: true }) rotulo!: string;

  @Input() obrigatoria = false;

  /** URL da imagem já salva no back, quando houver. */
  @Input() imagemAtual: string | null = null;

  /** Arquivo novo ainda não enviado. */
  @Input() arquivo: File | null = null;

  @Input() erro: string | null = null;

  @Output() arquivoEscolhido = new EventEmitter<File>();

  previewNova: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['arquivo']) {
      this.liberarPreview();
      this.previewNova = this.arquivo ? URL.createObjectURL(this.arquivo) : null;
    }
  }

  ngOnDestroy(): void {
    this.liberarPreview();
  }

  get textoUpload(): string {
    if (this.arquivo) {
      return this.arquivo.name;
    }

    if (this.imagemAtual) {
      return 'Selecione uma nova imagem para substituir (opcional)';
    }

    return this.obrigatoria ? 'Selecione uma imagem' : 'Selecione uma imagem (opcional)';
  }

  aoSelecionarArquivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    // Limpa o input pra permitir escolher o mesmo arquivo de novo.
    input.value = '';

    if (arquivo) {
      this.arquivoEscolhido.emit(arquivo);
    }
  }

  private liberarPreview(): void {
    if (this.previewNova) {
      URL.revokeObjectURL(this.previewNova);
      this.previewNova = null;
    }
  }
}
