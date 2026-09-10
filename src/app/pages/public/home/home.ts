import { Component } from '@angular/core';
import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { PublicFooter } from '@components/public-footer/public-footer';
import { PublicParceirosComponent } from './public-parceiros/public-parceiros';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    PublicNavbar,
    PublicFooter,
    PublicParceirosComponent,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {}