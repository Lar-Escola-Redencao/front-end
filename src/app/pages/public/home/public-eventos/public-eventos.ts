import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Evento } from 'src/app/shared/models/evento.model';
import { EventoPublicoService } from 'src/app/shared/services/evento-publico/evento-publico.service';

@Component({
  selector: 'app-public-eventos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-eventos.html',
  styleUrl: './public-eventos.css'
})
export class PublicEventosComponent implements OnInit {
  private readonly eventoPublicoService = inject(EventoPublicoService);
  private readonly cdr = inject(ChangeDetectorRef);

  eventosDestaque: Evento[] = [];
  carregando = true;

  private readonly quantidadeDestaque = 4;

  ngOnInit(): void {
    this.eventoPublicoService.listarPublicos().subscribe({
      next: (eventos) => {
        const agora = Date.now();
        this.eventosDestaque = eventos
          .filter(evento => new Date(evento.dataEvento).getTime() >= agora)
          .slice(0, this.quantidadeDestaque);
        this.carregando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.carregando = false;
        this.cdr.detectChanges();
      }
    });
  }

  formatarDia(data: Date | string): string {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(new Date(data));
  }

  formatarMes(data: Date | string): string {
    const mes = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(data));
    return mes.replace('.', '');
  }

  formatarAno(data: Date | string): string {
    return new Intl.DateTimeFormat('pt-BR', { year: 'numeric' }).format(new Date(data));
  }

  formatarHora(data: Date | string): string {
    const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(data));
    return hora.replace(':', 'h');
  }

  formatarValor(evento: Evento): string {
    if (!evento.valor) return 'Gratuito';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(evento.valor);
  }
}
