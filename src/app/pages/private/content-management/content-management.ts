import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Diretoria } from './components/diretoria/diretoria';
import { Transparencia } from './components/transparencia/transparencia';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOption, MatSelect } from '@angular/material/select';
import { EventoComponent } from './components/evento/evento.component';
import { PartnersManager } from './components/parceiro/partners-manager';
import { SocialLinksManager } from './components/redes-sociais/social-links-manager';

@Component({
  selector: 'app-content-management',
  standalone: true,
  imports: [MatFormFieldModule, MatSelect, MatOption, Diretoria,EventoComponent,PartnersManager,SocialLinksManager,Transparencia],
  templateUrl: './content-management.html',
  styleUrl: './content-management.css'
})
export class ContentManagement implements OnInit {
  secaoSelecionada: string = '';
  private secoesPermitidas = ['diretoria', 'evento', 'parceiro', 'redes-sociais', 'transparencia'];

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.route.paramMap.subscribe(parametros => {
      const secao = parametros.get('secao') ?? '';
      if (secao && !this.secoesPermitidas.includes(secao)) {
        this.router.navigate(['/dashboard/conteudo-publico'], { replaceUrl: true });
        return;
      }

      this.secaoSelecionada = secao;
    });
  }

  mudarSecao(secao: string) {
    this.router.navigate(secao ? ['/dashboard/conteudo-publico', secao] : ['/dashboard/conteudo-publico']);
  }
}
