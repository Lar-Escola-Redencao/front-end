import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Diretoria } from './components/diretoria/diretoria';
import { Eventos } from './components/eventos/eventos';
import { Parceiros } from './components/parceiros/parceiros';
import { RedesSociais } from './components/redes-sociais/redes-sociais';
import { Transparencia } from './components/transparencia/transparencia';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOption, MatSelect } from '@angular/material/select';

@Component({
  selector: 'app-content-management',
  standalone: true,
  imports: [MatFormFieldModule, MatSelect, MatOption, Diretoria,Eventos,Parceiros,RedesSociais,Transparencia],
  templateUrl: './content-management.html',
  styleUrl: './content-management.css'
})
export class ContentManagement implements OnInit {
  secaoSelecionada: string = '';
  private secoesPermitidas = ['diretoria', 'eventos', 'parceiros', 'redes-sociais', 'transparencia'];

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
