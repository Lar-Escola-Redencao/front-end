import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NAV_ITEMS } from '../../core/layout/sidebar/nav-items';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css',
})
export class DashboardPage {
  protected readonly navItems = NAV_ITEMS;
}
