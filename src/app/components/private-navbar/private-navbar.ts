import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { NgClass, NgIf } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-private-navbar',
  standalone: true,
  imports: [MatButtonModule, NgClass, NgIf, RouterLink, RouterLinkActive],
  templateUrl: './private-navbar.html',
  styleUrl: './private-navbar.css'
})
export class PrivateNavbar {
  menuVisivel: boolean = false;

  alternarMenu() {
    this.menuVisivel = !this.menuVisivel;
  }

  entrarNoPerfil() {
    console.log('Entra no perfil');
  }
}
