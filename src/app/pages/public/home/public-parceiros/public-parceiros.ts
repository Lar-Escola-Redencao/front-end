import { Component, OnInit, OnDestroy, HostListener, inject, ChangeDetectorRef } from '@angular/core';
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
export class PublicParceirosComponent implements OnInit, OnDestroy {
  private readonly publicContentService = inject(PublicContentService);
  private readonly cdr = inject(ChangeDetectorRef);
  
  parceirosOriginal: Partner[] = [];
  parceirosCarousel: Partner[] = [];
  carregando = true;

  currentIndex = 0;
  itemsPerPage = 3;

  isTransitioning = true;
  isAnimating = false;
  private autoPlayInterval: any;

  ngOnInit(): void {
    this.atualizarItemsPerPage();
    this.publicContentService.getParceirosAtivos().subscribe({
      next: (dados) => {
        this.parceirosOriginal = dados;
        if (dados.length > 1) {
          this.parceirosCarousel = [...dados, ...dados, ...dados, ...dados, ...dados];
          this.currentIndex = dados.length * 2;
        } else {
          this.parceirosCarousel = [...dados];
          this.currentIndex = 0;
        }
        this.carregando = false;
        this.cdr.detectChanges();
        this.startAutoPlay();
      },
      error: () => {
        this.carregando = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.atualizarItemsPerPage();
    this.cdr.detectChanges();
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
  }

  obterUrlImagem(caminho: string | null | undefined): string {
    return this.publicContentService.tratarUrlImagem(caminho);
  }

  startAutoPlay(): void {
    this.stopAutoPlay();
    if (this.parceirosOriginal.length > 1) {
      this.autoPlayInterval = setInterval(() => {
        this.next();
        this.cdr.detectChanges();
      }, 3000);
    }
  }

  stopAutoPlay(): void {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }
  }

  next(): void {
    if (this.parceirosOriginal.length <= 1 || this.isAnimating) return;
    this.isAnimating = true;
    this.currentIndex++;
    
    setTimeout(() => {
      if (this.currentIndex >= this.parceirosOriginal.length * 3) {
        this.resetPosition(this.currentIndex - this.parceirosOriginal.length);
      } else {
        this.isAnimating = false;
      }
    }, 500);
  }

  prev(): void {
    if (this.parceirosOriginal.length <= 1 || this.isAnimating) return;
    this.isAnimating = true;
    this.currentIndex--;
    
    setTimeout(() => {
      if (this.currentIndex <= this.parceirosOriginal.length) {
        this.resetPosition(this.currentIndex + this.parceirosOriginal.length);
      } else {
        this.isAnimating = false;
      }
    }, 500);
  }

  private resetPosition(newIndex: number): void {
    this.isTransitioning = false;
    this.cdr.detectChanges();

    this.currentIndex = newIndex;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.isTransitioning = true;
      this.isAnimating = false;
      this.cdr.detectChanges();
    }, 30);
  }

  get trackTransform(): string {
    if (this.itemsPerPage === 1) {
      return `translateX(-${this.currentIndex * 100}%)`;
    }
    const itemWidth = 100 / this.itemsPerPage;
    const offset = (-this.currentIndex * itemWidth) + ((100 - itemWidth) / 2);
    return `translateX(${offset}%)`;
  }
}