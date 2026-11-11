import { ErroCarregamento } from '@components/erro-carregamento/erro-carregamento';
import { EstadoVazio } from '@components/estado-vazio/estado-vazio';
import { ChangeDetectorRef, Component, EventEmitter, HostListener, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Unidade } from 'src/app/shared/models/unidade.model';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';
import { UnidadeCard } from 'src/app/components/unidade-card/unidade-card';

@Component({
  selector: 'app-public-unidades',
  standalone: true,
  imports: [ErroCarregamento, EstadoVazio, CommonModule, UnidadeCard],
  templateUrl: './public-unidades.html',
  styleUrl: './public-unidades.css'
})
export class PublicUnidadesComponent implements OnInit {
  @Output() carregado = new EventEmitter<boolean>();
  private readonly publicContentService = inject(PublicContentService);
  private readonly cdr = inject(ChangeDetectorRef);

  unidades: Unidade[] = [];
  carregando = false;
  erroCarregamento = false;
  indiceAtual = 0;
  emTransicao = true;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    if (this.carregando) return;
    this.carregando = true;
    this.erroCarregamento = false;
    this.publicContentService.getUnidades().subscribe({
      next: (unidades) => {
        this.unidades = unidades;
        this.indiceAtual = unidades.length;
        this.carregando = false;
        this.cdr.detectChanges();
        this.carregado.emit(true);
      },
      error: () => {
        this.erroCarregamento = true;
        this.unidades = [];
        this.carregando = false;
        this.cdr.detectChanges();
        this.carregado.emit(false);
      }
    });
  }

  get unidadesCarousel(): Unidade[] {
    if (!this.unidades.length) return [];
    return [...this.unidades, ...this.unidades, ...this.unidades];
  }

  get unidadesPorPagina(): number {
    if (window.innerWidth <= 600) return 1;
    if (window.innerWidth <= 900) return 2;
    return 3;
  }

  get trilhoTransform(): string {
    if (!this.unidades.length) return 'translateX(0)';
    return `translateX(-${this.indiceAtual * (100 / this.unidadesPorPagina)}%)`;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.cdr.detectChanges();
  }

  unidadeAnterior(): void {
    if (!this.unidades.length) return;
    this.indiceAtual--;

    if (this.indiceAtual < this.unidades.length) {
      setTimeout(() => {
        this.emTransicao = false;
        this.indiceAtual = this.unidades.length * 2 - 1;
        this.cdr.detectChanges();

        setTimeout(() => {
          this.emTransicao = true;
          this.cdr.detectChanges();
        }, 30);
      }, 450);
    }
  }

  proximaUnidade(): void {
    if (!this.unidades.length) return;
    this.indiceAtual++;

    if (this.indiceAtual >= this.unidades.length * 2) {
      setTimeout(() => {
        this.emTransicao = false;
        this.indiceAtual = this.unidades.length;
        this.cdr.detectChanges();

        setTimeout(() => {
          this.emTransicao = true;
          this.cdr.detectChanges();
        }, 30);
      }, 450);
    }
  }

  obterUrlImagem(caminho: string | null | undefined): string {
    return this.publicContentService.tratarUrlImagem(caminho);
  }

}
