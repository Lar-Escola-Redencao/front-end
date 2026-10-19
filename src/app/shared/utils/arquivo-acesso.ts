import { Observable } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpResponse } from '@angular/common/http';

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
  carregarArquivo: (url: string) => Observable<Blob | HttpResponse<Blob>>,
  toastr: ToastrService,
  aoIndisponivel?: () => void,
  caminhoOriginal = url
): void {
  carregarArquivo(url).subscribe({
    next: resposta => {
      const blob = resposta instanceof HttpResponse ? resposta.body : resposta;
      if (!blob) {
        aoIndisponivel?.();
        toastr.warning(MENSAGEM_ARQUIVO_INDISPONIVEL, TITULO_ARQUIVO_INDISPONIVEL);
        return;
      }
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const disposition = resposta instanceof HttpResponse ? resposta.headers.get('Content-Disposition') : null;
      link.download = obterNomeDownload(disposition, nomeArquivo, caminhoOriginal, blob.type);
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

export function obterNomeDownload(disposition: string | null, titulo: string, caminho: string, tipo: string): string {
  let nomeHeader = '';
  const codificado = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (codificado) {
    try {
      nomeHeader = decodeURIComponent(codificado.trim());
    } catch {
      // Usa o filename comum quando o nome codificado é inválido.
    }
  }
  if (!nomeHeader) {
    nomeHeader = disposition?.match(/filename="([^"]+)"|filename=([^;]+)/i)?.slice(1).find(Boolean)?.trim() || '';
  }
  const limpar = (nome: string) => nome.replace(/[\\/\r\n]/g, '_');
  if (nomeHeader) {
    return limpar(nomeHeader);
  }
  const extensao = caminho.split(/[?#]/)[0].match(/\.([a-z\d]+)$/i)?.[1];
  const tipos: Record<string, string> = {
    'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx'
  };
  const sufixo = extensao || tipos[tipo];
  const nome = limpar(titulo.trim() || 'documento');
  return sufixo && !nome.toLowerCase().endsWith(`.${sufixo.toLowerCase()}`) ? `${nome}.${sufixo}` : nome;
}
