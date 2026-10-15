import { ChangeDetectorRef } from '@angular/core';
import { of } from 'rxjs';

import { Eventos } from './eventos';
import { Evento, TipoEvento } from 'src/app/shared/models/evento.model';
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

  it('inclui madrugada e noite do mesmo dia e exclui os dias vizinhos', () => {
    component.eventos = ['2026-10-14T23:59:59', '2026-10-15T00:00:00',
      '2026-10-15T23:59:59', '2026-10-16T00:00:00'].map((data, id) => ({
        id, titulo: 'Evento', dataEvento: new Date(data)
      } as Evento));
    component.filtrar({ dataInicial: '2026-10-15', dataFinal: '2026-10-15', valor: 'todos', tipo: null });
    expect(component.eventosFiltrados.map(e => e.id)).toEqual([1, 2]);
  });

  it('combina categoria e valor com busca publica somente pelo titulo', () => {
    component.eventos = [
      { id: 1, titulo: 'Bazar', descricao: 'Festa', tipoEvento: TipoEvento.CULTURAL, valor: 10 },
      { id: 2, titulo: 'Festa', tipoEvento: TipoEvento.CULTURAL, valor: 10 },
      { id: 3, titulo: 'Festa', tipoEvento: TipoEvento.CULTURAL, valor: 0 },
      { id: 4, titulo: 'Festa', tipoEvento: TipoEvento.COMEMORATIVO, valor: 10 }
    ] as Evento[];
    component.buscar('Festa');
    component.filtrar({ dataInicial: '', dataFinal: '', valor: 'pago', tipo: TipoEvento.CULTURAL });
    expect(component.eventosFiltrados.map(e => e.id)).toEqual([2]);
  });
});
