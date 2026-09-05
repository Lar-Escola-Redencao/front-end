import { Component } from '@angular/core';
import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { PublicDiretoriaComponent } from './public-diretoria/public-diretoria';
import { PublicParceirosComponent } from './public-parceiros/public-parceiros';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [PublicNavbar, PublicDiretoriaComponent, PublicParceirosComponent],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {}