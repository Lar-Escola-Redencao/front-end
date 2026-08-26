import { Component } from '@angular/core';
import { PrivateNavbar } from '@components/private-navbar/private-navbar';

@Component({
  selector: 'app-dashboard',
  imports: [PrivateNavbar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {}
