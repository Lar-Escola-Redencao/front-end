import { Component, OnInit, OnDestroy, HostListener, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Diretoria } from 'src/app/shared/models/diretoria.model';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';

@Component({
  selector: 'app-public-diretoria',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './public-diretoria.html',
  styleUrl: './public-diretoria.css'
})
export class PublicDiretoriaComponent implements OnInit, OnDestroy {
  private readonly publicContentService = inject(PublicContentService);
  private readonly cdr = inject(ChangeDetectorRef);
  
  diretoresOriginal: Diretoria[] = [];
  diretoresCarousel: Diretoria[] = [];
  carregando = true;

  currentIndex = 0;
  itemsPerPage = 3;

  isTransitioning = true;
  isAnimating = false;
  private autoPlayInterval: any;

  ngOnInit(): void {
    this.atualizarItemsPerPage();
    this.publicContentService.getDiretoriaAtiva().subscribe({
      next: (dados) => {
        this.diretoresOriginal = dados;
        if (dados.length > 1) {
          this.diretoresCarousel = [...dados, ...dados, ...dados, ...dados, ...dados];
          this.currentIndex = dados.length * 2;
        } else {
          this.diretoresCarousel = [...dados];
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
    
    if (width < 900) {
      this.itemsPerPage = 1;
    } else {
      this.itemsPerPage = 3;
    }
  }

  obterUrlImagem(caminho: string | null | undefined): string {
    return this.publicContentService.tratarUrlImagem(caminho);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    img.nextElementSibling?.classList.remove('imagem-fallback-hidden');
  }

  startAutoPlay(): void {
    this.stopAutoPlay();
    if (this.diretoresOriginal.length > 1) {
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
    if (this.diretoresOriginal.length <= 1 || this.isAnimating) return;
    this.isAnimating = true;
    this.currentIndex++;
    
    setTimeout(() => {
      if (this.currentIndex >= this.diretoresOriginal.length * 3) {
        this.resetPosition(this.currentIndex - this.diretoresOriginal.length);
      } else {
        this.isAnimating = false;
      }
    }, 500);
  }

  prev(): void {
    if (this.diretoresOriginal.length <= 1 || this.isAnimating) return;
    this.isAnimating = true;
    this.currentIndex--;
    
    setTimeout(() => {
      if (this.currentIndex <= this.diretoresOriginal.length) {
        this.resetPosition(this.currentIndex + this.diretoresOriginal.length);
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

  isCenter(index: number): boolean {
    return index === this.currentIndex;
  }

  isSide(index: number): boolean {
    if (this.itemsPerPage === 1) return false;
    return index === this.currentIndex - 1 || index === this.currentIndex + 1;
  }

  isOutOfView(index: number): boolean {
    if (this.itemsPerPage === 1) return index !== this.currentIndex;
    return !this.isCenter(index) && !this.isSide(index);
  }
}
