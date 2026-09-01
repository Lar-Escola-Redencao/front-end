import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Partner } from 'src/app/shared/models/partner.model';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';

@Component({
  selector: 'app-public-parceiros',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './public-parceiros.html',
  styleUrl: './public-parceiros.css'
})
export class PublicParceirosComponent implements OnInit {
  private readonly publicContentService = inject(PublicContentService);
  
  parceiros: Partner[] = [];
  carregando = true;

  currentIndex = 0;
  itemsPerPage = 3;

  ngOnInit(): void {
    this.atualizarItemsPerPage();
    this.publicContentService.getParceirosAtivos().subscribe({
      next: (dados) => {
        this.parceiros = dados;
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
      }
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.atualizarItemsPerPage();
  }

  atualizarItemsPerPage(): void {
    const width = window.innerWidth;
    
    if (width < 600) {
      this.itemsPerPage = 1;
    } else if (width < 900) {
      this.itemsPerPage = 2;
    } else {
      this.itemsPerPage = 3;
    }

    if (this.currentIndex > Math.max(0, this.parceiros.length - this.itemsPerPage)) {
      this.currentIndex = Math.max(0, this.parceiros.length - this.itemsPerPage);
    }
  }

  obterUrlImagem(caminho: string | null | undefined): string {
    return this.publicContentService.tratarUrlImagem(caminho);
  }

  next(): void {
    if (this.currentIndex < this.parceiros.length - this.itemsPerPage) {
      this.currentIndex++;
    }
  }

  prev(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }
}