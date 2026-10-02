import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { GrupoSecaoConfig, PaginaSecoesConfig } from './paginas-secoes.config';
import { SecaoFormulario } from './secao-formulario/secao-formulario';
import { SecaoTabela } from './secao-tabela/secao-tabela';

/**
 * Página do CMS montada a partir de PAGINAS_SECOES_CONFIG: uma aba por grupo
 * (as abas só aparecem quando há mais de um) e, em cada aba, o formulário
 * único ou a tabela com CRUD, conforme a `exibicao` do grupo.
 */
@Component({
  selector: 'app-pagina-secoes',
  standalone: true,
  imports: [SecaoFormulario, SecaoTabela],
  templateUrl: './pagina-secoes.html',
  styleUrl: './paginas-secoes.css',
})
export class PaginaSecoes implements OnInit, OnDestroy {
  @Input({ required: true }) config!: PaginaSecoesConfig;

  grupoAtivo!: GrupoSecaoConfig;

  private routeSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.grupoAtivo = this.config.grupos[0];

    // Mesmo esquema da página Sobre: a aba ativa fica no query param `aba`.
    this.routeSub = this.route.queryParamMap.subscribe((params) => {
      const aba = params.get('aba');
      this.grupoAtivo =
        this.config.grupos.find((grupo) => grupo.grupo === aba) ?? this.config.grupos[0];
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  mudarAba(grupo: GrupoSecaoConfig): void {
    if (grupo === this.grupoAtivo) {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { aba: grupo.grupo },
      queryParamsHandling: 'merge',
    });
  }
}
