import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { PublicEventosComponent } from './public-eventos';
import { EventoPublicoService } from 'src/app/shared/services/evento-publico/evento-publico.service';

describe('PublicEventosComponent', () => {
  let component: PublicEventosComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PublicEventosComponent,
        {
          provide: EventoPublicoService,
          useValue: {
            listarPublicos: () => of([])
          }
        }
      ]
    });

    component = TestBed.inject(PublicEventosComponent);
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
