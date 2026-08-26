import { Component } from '@angular/core';
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
export class ContentManagement {
  secaoSelecionada: string = '';

  mudarSecao(secao: string) {
    this.secaoSelecionada = secao;
  }
}
