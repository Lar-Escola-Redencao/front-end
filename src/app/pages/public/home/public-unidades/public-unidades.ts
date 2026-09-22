import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
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

  ngOnInit(): void {
    this.publicContentService.getUnidades().subscribe({
      next: (unidades) => {
        this.unidades = unidades;
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
