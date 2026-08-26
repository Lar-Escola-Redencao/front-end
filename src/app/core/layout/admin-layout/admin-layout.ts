import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { ToastContainer } from '../../../shared/ui/toast/toast-container';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, Sidebar, ToastContainer],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayout {}
