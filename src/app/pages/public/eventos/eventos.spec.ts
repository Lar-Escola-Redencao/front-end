import { ChangeDetectorRef } from '@angular/core';
import { of } from 'rxjs';

import { Eventos } from './eventos';
import { EventoPublicoService } from 'src/app/shared/services/evento-publico/evento-publico.service';

describe('Eventos', () => {
  let component: Eventos;

  beforeEach(() => {
    const eventoPublicoService = {
      listarPublicos: () => of([])
    } as unknown as EventoPublicoService;

    component = new Eventos(
      eventoPublicoService,
      { detectChanges: () => undefined } as ChangeDetectorRef
    );
  });

  it('usa a imagem ja normalizada pela listagem publica', () => {
    expect(component.obterUrlImagem('/api/uploads/evento.jpg')).toBe('/api/uploads/evento.jpg');
  });

  it('marca apenas o evento informado com imagem indisponivel', () => {
    component.onEventoImageError(10);

    expect(component.eventoImagemIndisponivel(10)).toBe(true);
    expect(component.eventoImagemIndisponivel(11)).toBe(false);
  });
});
