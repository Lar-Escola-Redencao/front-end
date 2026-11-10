import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, Input, OnChanges, ViewChild, inject } from '@angular/core';
import { Unidade } from 'src/app/shared/models/unidade.model';
import { DiasFuncionamentoPipe } from 'src/app/shared/pipes/dias-funcionamento.pipe';
import { BloquearScroll } from 'src/app/shared/directives/bloquear-scroll';

@Component({
  selector: 'app-unidade-card',
  standalone: true,
  imports: [CommonModule, DiasFuncionamentoPipe, BloquearScroll],
  templateUrl: './unidade-card.html',
  styleUrl: './unidade-card.css',
})
export class UnidadeCard implements OnChanges {
  @Input({ required: true }) unidade!: Unidade;
  @Input() numero = 1;
  @Input() imagemUrl = '';
  imagemIndisponivel = false;
  imagemAmpliada = false;
  @ViewChild('lightbox') private lightboxRef?: ElementRef<HTMLDialogElement>;
  private readonly cdr = inject(ChangeDetectorRef);

  get hrefTelefone(): string | null {
    const telefone = String(this.unidade.telefone ?? '').replace(/\D/g, '');
    return telefone ? `tel:${telefone}` : null;
  }

  get podeAmpliar(): boolean {
    return !!this.imagemUrl && !this.imagemIndisponivel;
  }

  ngOnChanges(): void {
    this.imagemIndisponivel = false;
  }

  abrirImagem(): void {
    if (!this.podeAmpliar) return;
    this.imagemAmpliada = true;
    this.cdr.detectChanges();
    this.lightboxRef?.nativeElement.showModal();
  }

  fecharImagem(): void {
    this.lightboxRef?.nativeElement.close();
  }

  fecharAoClicarFora(evento: MouseEvent): void {
    if (evento.target === evento.currentTarget) this.fecharImagem();
  }

  formatarHorario(unidade: Unidade): string {
    return `${this.formatarHora(unidade.horarioAbertura)} às ${this.formatarHora(unidade.horarioFechamento)}`;
  }

  private formatarHora(hora: string): string {
    const [horas, minutos] = (hora || '').split(':');
    if (!horas) return hora ?? '';
    return minutos && minutos !== '00' ? `${horas}h${minutos}` : `${horas}h`;
  }
}
