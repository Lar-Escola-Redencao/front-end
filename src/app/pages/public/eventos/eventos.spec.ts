import { ChangeDetectorRef } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Eventos } from './eventos';
import { Evento, TipoEvento } from 'src/app/shared/models/evento.model';
import { EventoPublicoService } from 'src/app/shared/services/evento-publico/evento-publico.service';

describe('Eventos', () => {
  let component: Eventos;

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-11-16T12:00:00').getTime());
    const eventoPublicoService = {
      listarPublicos: () => of([])
    } as unknown as EventoPublicoService;

    component = new Eventos(
      eventoPublicoService,
      { detectChanges: () => undefined } as ChangeDetectorRef
    );
  });

  afterEach(() => vi.restoreAllMocks());

  it('usa a imagem ja normalizada pela listagem publica', () => {
    expect(component.obterUrlImagem('/api/uploads/evento.jpg')).toBe('/api/uploads/evento.jpg');
  });

  it('inicia sem filtros e prioriza os eventos futuros mais próximos', () => {
    const dados = [
      { id: 1, titulo: 'Antigo', dataEvento: '2020-01-01T10:00:00' },
      { id: 3, titulo: 'Futuro distante', dataEvento: '2030-12-01T10:00:00' },
      { id: 2, titulo: 'Futuro', dataEvento: '2030-01-01T10:00:00' },
    ] as unknown as Evento[];
    const pagina = new Eventos(
      { listarPublicos: () => of(dados) } as unknown as EventoPublicoService,
      { detectChanges: () => undefined } as ChangeDetectorRef,
    );
    pagina.ngOnInit();
    expect(pagina.possuiFiltrosAplicados).toBe(false);
    expect(pagina.eventosPaginados.map(evento => evento.id)).toEqual([2, 3, 1]);
    expect(dados.map(evento => evento.id)).toEqual([1, 3, 2]);
  });

  it('ordena futuros e encerrados antes de paginar, preservando busca, filtros e desempates', () => {
    const dados = [
      { id: 1, dataEvento: '2026-11-01T10:00:00' },
      { id: 3, dataEvento: '2026-12-01T10:00:00' },
      { id: 4, dataEvento: '2026-11-15T10:00:00' },
      { id: 2, dataEvento: '2026-11-16T12:00:00' },
      { id: 6, dataEvento: '2026-11-16T12:00:00', valor: 10 },
      { id: 5, dataEvento: '2026-11-01T10:00:00' },
    ].map(evento => ({ titulo: 'Teste', valor: 0, ...evento })) as unknown as Evento[];
    const pagina = new Eventos(
      { listarPublicos: () => of(dados) } as unknown as EventoPublicoService,
      { detectChanges: () => undefined } as ChangeDetectorRef,
    );
    pagina.tamanhoPagina = 2;
    pagina.ngOnInit();
    expect(pagina.eventosFiltrados.map(evento => evento.id)).toEqual([6, 2, 3, 4, 5, 1]);
    expect(pagina.eventosPaginados.map(evento => evento.id)).toEqual([6, 2]);
    pagina.proximaPagina();
    expect(pagina.eventosPaginados.map(evento => evento.id)).toEqual([3, 4]);
    pagina.proximaPagina();
    expect(pagina.eventosPaginados.map(evento => evento.id)).toEqual([5, 1]);
    pagina.buscar('Teste');
    expect(pagina.paginaAtual).toBe(0);
    expect(pagina.eventosFiltrados).toHaveLength(6);
    pagina.filtrar({ dataInicial: '', dataFinal: '', valor: 'gratuito', tipo: null });
    expect(pagina.eventosFiltrados.map(evento => evento.id)).toEqual([2, 3, 4, 5, 1]);
  });

  it('distingue cadastro vazio de busca ou filtros sem resultados', () => {
    component.ngOnInit();
    expect(component.mensagemVazia).toBe('Nenhum evento disponível no momento.');
    component.buscar('Bazar');
    expect(component.mensagemVazia).toBe('Nenhum evento encontrado para a busca ou os filtros selecionados.');
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
