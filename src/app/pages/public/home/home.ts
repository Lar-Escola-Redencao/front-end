import { Component } from '@angular/core';
import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { PublicDiretoriaComponent } from './public-diretoria/public-diretoria';
import { PublicParceirosComponent } from './public-parceiros/public-parceiros';
import { PublicEventosComponent } from './public-eventos/public-eventos';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [PublicNavbar, PublicDiretoriaComponent, PublicEventosComponent, PublicParceirosComponent],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {}