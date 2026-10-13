import { Component, inject, signal } from '@angular/core';
import { PublicFooter } from '@components/public-footer/public-footer';

import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { Secao, Documento } from 'src/app/shared/models/transparencia.model';
import { TransparenciaPublicaService } from 'src/app/shared/services/transparencia/transparencia-publica.service';
import { ToastrService } from 'ngx-toastr';
import { baixarArquivoComVerificacao, visualizarArquivoComVerificacao } from 'src/app/shared/utils/arquivo-acesso';

@Component({
  selector: 'app-transparencia',
  standalone: true,
  imports: [PublicNavbar, PublicFooter],
  templateUrl: './transparencia.html',
  styleUrl: './transparencia.css',
})
export class Transparencia {
  private readonly transparenciaService = inject(TransparenciaPublicaService);
  private readonly toastr = inject(ToastrService);

  protected readonly secoes = signal<Secao[]>([]);
  protected readonly secoesAbertas = signal<Set<number>>(new Set());
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly arquivosIndisponiveis = signal<Set<string>>(new Set());
  private readonly timeoutsArquivosIndisponiveis = new Map<string, ReturnType<typeof setTimeout>>();

  constructor() {
    this.carregar();
  }

  protected carregar(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.transparenciaService.listarSecoes().subscribe({
      next: (secoes) => {
        this.secoes.set(
          secoes.filter((secao) => secao.ativo && secao.documentos.length > 0),
        );
        this.secoesAbertas.set(new Set());
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set(
          'Não foi possível carregar os documentos de transparência. Tente novamente.',
        );
        this.isLoading.set(false);
      },
    });
  }

  protected urlVisualizar(documento: Documento): string {
    return this.transparenciaService.urlVisualizar(documento);
  }

  protected urlBaixar(documento: Documento): string {
    return this.transparenciaService.urlBaixar(documento);
  }

  protected visualizarDocumento(event: Event, documento: Documento): void {
    event.preventDefault();
    const url = this.urlVisualizar(documento);
    if (this.arquivoIndisponivel(url)) {
      this.toastr.warning('Arquivo não encontrado ou indisponível.', 'Arquivo indisponível');
      return;
    }
    visualizarArquivoComVerificacao(url, arquivoUrl => this.transparenciaService.carregarArquivo(arquivoUrl), this.toastr, () => this.marcarArquivoIndisponivel(url));
  }

  protected baixarDocumento(event: Event, documento: Documento): void {
    event.preventDefault();
    const url = this.urlBaixar(documento);
    if (this.arquivoIndisponivel(url)) {
      this.toastr.warning('Arquivo não encontrado ou indisponível.', 'Arquivo indisponível');
      return;
    }
    baixarArquivoComVerificacao(url, documento.titulo || '', arquivoUrl => this.transparenciaService.carregarArquivo(arquivoUrl), this.toastr, () => this.marcarArquivoIndisponivel(url));
  }

  protected arquivoIndisponivel(url: string): boolean {
    return this.arquivosIndisponiveis().has(url);
  }

  private marcarArquivoIndisponivel(url: string): void {
    this.arquivosIndisponiveis.update(urls => new Set(urls).add(url));
    clearTimeout(this.timeoutsArquivosIndisponiveis.get(url));
    this.timeoutsArquivosIndisponiveis.set(url, setTimeout(() => {
      this.arquivosIndisponiveis.update(urls => {
        const proximos = new Set(urls);
        proximos.delete(url);
        return proximos;
      });
      this.timeoutsArquivosIndisponiveis.delete(url);
    }, 2000));
  }

  protected alternarSecao(secaoId: number): void {
    this.secoesAbertas.update((idsAbertos) => {
      const proximosIds = new Set(idsAbertos);

      if (proximosIds.has(secaoId)) {
        proximosIds.delete(secaoId);
      } else {
        proximosIds.add(secaoId);
      }

      return proximosIds;
    });
  }

  protected secaoAberta(secaoId: number): boolean {
    return this.secoesAbertas().has(secaoId);
  }
}
