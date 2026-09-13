import { Component } from '@angular/core';
import { PublicNavbar } from '@components/public-navbar/public-navbar';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [PublicNavbar],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {}