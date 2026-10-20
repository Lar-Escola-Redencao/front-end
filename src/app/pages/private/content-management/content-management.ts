import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Transparencia } from './components/transparencia/transparencia';
import { Sobre } from './components/sobre/sobre';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOption, MatSelect } from '@angular/material/select';
import { EventoComponent } from './components/evento/evento.component';
import { PartnersManager } from './components/parceiro/partners-manager';
import { SocialLinksManager } from './components/redes-sociais/social-links-manager';
import { DiretoriaComponent } from './components/diretoria/diretoria.component';
import { CaptacaoRecursos } from './components/captacao-recursos/captacao-recursos';
import { CAPTACAO_RECURSOS_CONFIG, CaptacaoRecursosConfig } from './components/captacao-recursos/captacao-recursos.config';

@Component({
  selector: 'app-content-management',
  standalone: true,
  imports: [MatFormFieldModule, MatSelect, MatOption, DiretoriaComponent,EventoComponent,PartnersManager,SocialLinksManager,Transparencia,Sobre,CaptacaoRecursos],
  templateUrl: './content-management.html',
  styleUrl: './content-management.css'
})
export class ContentManagement implements OnInit {
  secaoSelecionada: string = 'evento';
  /** Páginas montadas pela configuração declarativa (Gráfica, Pix). */
  readonly captacaoRecursos = CAPTACAO_RECURSOS_CONFIG;
  private secoesPermitidas = [
    'diretoria', 'evento', 'parceiro', 'redes-sociais', 'transparencia', 'sobre',
    ...this.captacaoRecursos.map(pagina => pagina.secao),
  ];

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.route.paramMap.subscribe(parametros => {
      const secao = parametros.get('secao') ?? 'evento';
      if (secao && !this.secoesPermitidas.includes(secao)) {
        this.router.navigate(['/dashboard/conteudo-publico'], { replaceUrl: true });
        return;
      }

      this.secaoSelecionada = secao;
    });
  }

  get captacaoRecursosSelecionada(): CaptacaoRecursosConfig | undefined {
    return this.captacaoRecursos.find(pagina => pagina.secao === this.secaoSelecionada);
  }

  mudarSecao(secao: string) {
    this.router.navigate(secao ? ['/dashboard/conteudo-publico', secao] : ['/dashboard/conteudo-publico']);
  }
}
