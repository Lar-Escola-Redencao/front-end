import { Component } from '@angular/core';
import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { PublicFooter } from '@components/public-footer/public-footer';
import { PublicParceirosComponent } from './public-parceiros/public-parceiros';
import { PublicEventosComponent } from './public-eventos/public-eventos';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [PublicNavbar, PublicFooter, PublicEventosComponent, PublicParceirosComponent],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {}