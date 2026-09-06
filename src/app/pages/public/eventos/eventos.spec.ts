import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Eventos } from './eventos';
import { Evento, TipoEvento } from 'src/app/shared/models/evento.model';
import { EventoPublicoService } from 'src/app/shared/services/evento-publico/evento-publico.service';

describe('Eventos', () => {
  let component: Eventos;
  let fixture: ComponentFixture<Eventos>;

  const eventos = Array.from({ length: 7 }, (_, index): Evento => ({
    id: index + 1,
    titulo: `Evento ${index + 1}`,
    descricao: `Descricao ${index + 1}`,
    dataEvento: new Date(2099, 0, index + 1, 10),
    endereco: 'Rua Teste',
    imagem: 'imagem.jpg',
    valor: index === 6 ? 10 : undefined,
    tipoEvento: TipoEvento.CULTURAL,
    parceiros: []
  }));

  const eventoPublicoServiceMock = {
    listarPublicos: vi.fn(() => of(eventos))
  };

  beforeEach(async () => {
    eventoPublicoServiceMock.listarPublicos.mockReturnValue(of(eventos));

    await TestBed.configureTestingModule({
      imports: [Eventos],
      providers: [
        {
          provide: EventoPublicoService,
          useValue: eventoPublicoServiceMock
        },
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Eventos);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('deve exibir no maximo 6 eventos por pagina', () => {
    expect(component.tamanhoPagina).toBe(6);
    expect(component.eventosPaginados).toHaveLength(6);
    expect(component.eventosPaginados[0].id).toBe(1);
    expect(component.eventosPaginados[5].id).toBe(6);
  });

  it('deve exibir eventos excedentes ao navegar para a proxima pagina', () => {
    component.alterarPagina({
      pageIndex: 1,
      pageSize: 6,
      length: component.eventosFiltrados.length
    });

    expect(component.eventosPaginados).toHaveLength(1);
    expect(component.eventosPaginados[0].id).toBe(7);
  });

  it('deve reiniciar para a primeira pagina ao buscar com filtros', () => {
    component.alterarPagina({
      pageIndex: 1,
      pageSize: 6,
      length: component.eventosFiltrados.length
    });

    component.filtroValor = 'gratuito';
    component.buscar();

    expect(component.paginaAtual).toBe(0);
    expect(component.eventosPaginados).toHaveLength(6);
    expect(component.eventosPaginados.some(evento => evento.valor)).toBe(false);
  });
});
