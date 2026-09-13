import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-public-navbar',
  standalone: true, 
  imports: [RouterLink, MatButtonModule], 
  templateUrl: './public-navbar.html',
  styleUrl: './public-navbar.css',
})
export class PublicNavbar {
  menuAberto = signal(false);

  constructor(private router: Router) {}

  alternarMenu() {
    this.menuAberto.update(valor => !valor);
  }

  realizarLogin() {
    this.menuAberto.set(false);
    this.router.navigate(['/entrar']);
  }
}