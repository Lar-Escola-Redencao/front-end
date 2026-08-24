import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-public-navbar',
  standalone: true, 
  imports: [],
  templateUrl: './public-navbar.html',
  styleUrl: './public-navbar.css',
})
export class PublicNavbar {
  menuAberto = signal(false);

  alternarMenu() {
    this.menuAberto.update(valor => !valor);
  }
}
