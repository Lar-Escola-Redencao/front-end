import { Component } from '@angular/core';
import { PrivateNavbar } from '@components/private-navbar/private-navbar';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  imports: [PrivateNavbar, RouterOutlet],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {}
