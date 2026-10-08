import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  PaginaCmsService,
  Secao,
  ID_PAGINA_SOBRE,
} from 'src/app/shared/services/pagina/pagina-cms.service';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';
import { PaginaResposta } from 'src/app/shared/models/pagina.model';
import { Unidade } from 'src/app/shared/models/unidade.model';
import { environment } from 'src/environments/environment';

export interface ConteudoSobre {
  texto: Secao[];
  historia: Secao[];
  carrossel: Secao[];
}

export interface IndicadoresSobre {
  totalMeninos: number;
  dataFundacao: string;
}

@Injectable({ providedIn: 'root' })
export class SobrePublicoService {
  private readonly paginas = inject(PaginaCmsService);
  private readonly conteudoPublico = inject(PublicContentService);
  private readonly http = inject(HttpClient);

  obterConteudo(): Observable<ConteudoSobre> {
    return this.paginas.obterPagina(ID_PAGINA_SOBRE).pipe(
      map((pagina) => {
        const secoes: Secao[] = pagina['ativo'] === false ? [] : (pagina['secoes'] ?? []);
        const ativas = secoes
          .filter((secao) => secao.ativo)
          .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.id - b.id)
          .map((secao) => ({
            ...secao,
            imagem: this.conteudoPublico.tratarUrlImagem(secao.imagem),
          }));
        return {
          texto: ativas.filter((secao) => secao.grupo === 'texto-sobre'),
          historia: ativas.filter((secao) => secao.grupo === 'historia'),
          carrossel: ativas
            .filter((secao) => secao.grupo === 'carrossel' && secao.imagem)
            .slice(0, 8),
        };
      }),
    );
  }

  obterTotalUnidades(): Observable<number> {
    return this.http
      .get<PaginaResposta<Unidade>>(`${environment.apiUrl}/unidade/todas`, {
        params: { size: 1 },
      })
      .pipe(map((resposta) => resposta.page.totalElements));
  }

  obterIndicadores(): Observable<IndicadoresSobre> {
    return this.http.get<IndicadoresSobre>(`${environment.apiUrl}/paginas/sobre/indicadores`);
  }
}
