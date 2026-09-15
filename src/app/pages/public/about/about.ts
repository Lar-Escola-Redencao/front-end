import { Component } from '@angular/core';
import { PublicFooter } from '@components/public-footer/public-footer';
import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { PublicDiretoriaComponent } from './public-diretoria/public-diretoria';

@Component({
  selector: 'app-about',
  imports: [PublicNavbar, PublicFooter, PublicDiretoriaComponent],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {}
