import { ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Unidade } from 'src/app/shared/models/unidade.model';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';
import { DiasFuncionamentoPipe } from 'src/app/shared/pipes/dias-funcionamento.pipe';

@Component({
  selector: 'app-public-unidades',
  standalone: true,
  imports: [CommonModule, DiasFuncionamentoPipe],
  templateUrl: './public-unidades.html',
  styleUrl: './public-unidades.css'
})
export class PublicUnidadesComponent implements OnInit {
  private readonly publicContentService = inject(PublicContentService);
  private readonly cdr = inject(ChangeDetectorRef);

  unidades: Unidade[] = [];
  carregando = true;
  indiceAtual = 0;
  emTransicao = true;

  ngOnInit(): void {
    this.publicContentService.getUnidades().subscribe({
      next: (unidades) => {
        this.unidades = unidades;
        this.indiceAtual = unidades.length;
        this.carregando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.unidades = [];
        this.carregando = false;
        this.cdr.detectChanges();
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

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  formatarHorario(unidade: Unidade): string {
    const abertura = this.formatarHora(unidade.horarioAbertura);
    const fechamento = this.formatarHora(unidade.horarioFechamento);
    return `${abertura} às ${fechamento}`;
  }

  private formatarHora(hora: string): string {
    const [horas, minutos] = (hora || '').split(':');
    if (!horas) return hora ?? '';
    return minutos && minutos !== '00' ? `${horas}h${minutos}` : `${horas}h`;
  }
}
