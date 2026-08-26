import { Component } from '@angular/core';
import { PrivateNavbar } from '@components/private-navbar/private-navbar';
import { ContentManagement } from '../content-management/content-management';

@Component({
  selector: 'app-dashboard',
  imports: [PrivateNavbar, ContentManagement],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {}
