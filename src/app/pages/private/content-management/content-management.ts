import { Component } from '@angular/core';
import { Diretoria } from './components/diretoria/diretoria';
import { Eventos } from './components/eventos/eventos';
import { Parceiros } from './components/parceiros/parceiros';
import { RedesSociais } from './components/redes-sociais/redes-sociais';
import { Transparencia } from './components/transparencia/transparencia';

@Component({
  selector: 'app-content-management',
  standalone: true,
  imports: [Diretoria,Eventos,Parceiros,RedesSociais,Transparencia], // Declare os filhos aqui
  templateUrl: './content-management.html',
  styleUrl: './content-management.css'
})
export class ContentManagement {
  secaoSelecionada: string = '';

  mudarSecao(event: any) {
    this.secaoSelecionada = event.target.value;
  }
}