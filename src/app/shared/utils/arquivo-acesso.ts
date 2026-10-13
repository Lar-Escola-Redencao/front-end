import { Observable } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

const MENSAGEM_ARQUIVO_INDISPONIVEL = 'Arquivo não encontrado ou indisponível.';
const TITULO_ARQUIVO_INDISPONIVEL = 'Arquivo indisponível';

export function visualizarArquivoComVerificacao(
  url: string,
  carregarArquivo: (url: string) => Observable<Blob>,
  toastr: ToastrService,
  aoIndisponivel?: () => void
): void {
  carregarArquivo(url).subscribe({
    next: blob => {
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    },
    error: () => {
      aoIndisponivel?.();
      toastr.warning(MENSAGEM_ARQUIVO_INDISPONIVEL, TITULO_ARQUIVO_INDISPONIVEL);
    }
  });
}

export function baixarArquivoComVerificacao(
  url: string,
  nomeArquivo: string,
  carregarArquivo: (url: string) => Observable<Blob>,
  toastr: ToastrService,
  aoIndisponivel?: () => void
): void {
  carregarArquivo(url).subscribe({
    next: blob => {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = nomeArquivo;
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1_000);
    },
    error: () => {
      aoIndisponivel?.();
      toastr.warning(MENSAGEM_ARQUIVO_INDISPONIVEL, TITULO_ARQUIVO_INDISPONIVEL);
    }
  });
}
