import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PublicNavbar } from './components/public-navbar/public-navbar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PublicNavbar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('front-end');
}