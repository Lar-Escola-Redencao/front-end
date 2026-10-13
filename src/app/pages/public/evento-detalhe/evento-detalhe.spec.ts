import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { EventoDetalhe } from './evento-detalhe';
import { EventoPublicoService } from 'src/app/shared/services/evento-publico/evento-publico.service';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';
import { Evento, EventoRedeSocial, TipoEvento } from 'src/app/shared/models/evento.model';

const redesSociais: EventoRedeSocial[] = [
  { idRedeSocial: 1, nome: 'Facebook', icone: 'facebook.svg', urlLink: 'https://facebook.com/lar/post-1' },
  { idRedeSocial: 2, nome: 'Instagram', icone: 'instagram.svg', urlLink: 'https://instagram.com/p/abc' }
];

function criarEvento(sobrescrever: Partial<Evento> = {}): Evento {
  return {
    id: 1,
    titulo: 'Evento teste',
    descricao: 'Descricao',
    dataEvento: new Date('2020-01-01T12:00:00'),
    endereco: 'Rua teste',
    imagem: 'foto-principal.jpg',
    tipoEvento: TipoEvento.CULTURAL,
    parceiros: [],
    ...sobrescrever
  };
}

describe('EventoDetalhe', () => {
  let fixture: ComponentFixture<EventoDetalhe>;
  let component: EventoDetalhe;
  let elemento: HTMLElement;

  function falharImagemPrincipal(): void {
    elemento.querySelector<HTMLImageElement>('.imagem-principal')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
  }

  async function montar(evento: Evento): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [EventoDetalhe],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } },
        {
          provide: EventoPublicoService,
          useValue: {
            buscarPorId: () => of(evento),
            tratarImagem: (url: string | null | undefined) => url ?? ''
          }
        },
        {
          provide: PublicContentService,
          useValue: {
            tratarUrlImagem: (url: string | null | undefined) => url ?? '',
            getRedesSociaisAtivas: () => of([])
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EventoDetalhe);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    elemento = fixture.nativeElement;
  }

  describe('evento encerrado, com redes sociais cadastradas', () => {
    beforeEach(() => montar(criarEvento({ redesSociais })));

    it('escurece a imagem principal e exibe o texto centralizado no overlay', () => {
      const overlay = elemento.querySelector('.imagem-principal-wrapper .imagem-overlay');

      expect(elemento.querySelector('.imagem-principal')?.getAttribute('src')).toBe('foto-principal.jpg');
      expect(overlay).toBeTruthy();
      expect(overlay?.querySelector('.imagem-overlay-texto')?.textContent?.trim()).toBe(
        'Acompanhe o que aconteceu através das nossas redes'
      );
    });

    it('renderiza um icone por rede social, na ordem retornada pela API', () => {
      const icones = Array.from(elemento.querySelectorAll<HTMLImageElement>('.rede-social-link img'));

      expect(icones.map(img => img.getAttribute('src'))).toEqual(['facebook.svg', 'instagram.svg']);
      expect(icones.map(img => img.alt)).toEqual(['Facebook', 'Instagram']);
    });

    it('abre cada link em uma nova aba', () => {
      const links = Array.from(elemento.querySelectorAll<HTMLAnchorElement>('.rede-social-link'));

      expect(links.map(a => a.getAttribute('href'))).toEqual(redesSociais.map(r => r.urlLink));
      links.forEach(a => {
        expect(a.getAttribute('target')).toBe('_blank');
        expect(a.getAttribute('rel')).toContain('noopener');
      });
    });

    it('exibe icone generico quando a imagem do icone falha ao carregar', () => {
      const img = elemento.querySelector<HTMLImageElement>('.rede-social-link img')!;
      const fallback = elemento.querySelector<HTMLElement>('.rede-social-link .rede-social-fallback')!;
      expect(fallback.classList.contains('rede-social-fallback-hidden')).toBe(true);

      component.onIconeRedeError({ target: img } as unknown as Event);

      expect(img.style.display).toBe('none');
      expect(fallback.classList.contains('rede-social-fallback-hidden')).toBe(false);
    });

    it('expande a imagem ao clicar sobre a area da imagem mesmo com overlay de redes sociais', () => {
      expect(elemento.querySelector('.lightbox')).toBeNull();

      elemento.querySelector<HTMLElement>('.imagem-overlay')!.click();
      fixture.detectChanges();

      const lightbox = elemento.querySelector('.lightbox');
      expect(lightbox).toBeTruthy();
      expect(lightbox?.querySelector<HTMLImageElement>('.lightbox-imagem')?.getAttribute('src')).toBe('foto-principal.jpg');
    });

    it('nao renderiza carrossel de midias nem nota pos-evento', () => {
      const seletores = ['.carrossel-controles', '.miniaturas', '.miniatura', '.evento-nota-pos'];
      seletores.forEach(seletor => expect(elemento.querySelector(seletor)).toBeNull());
    });
  });

  describe('evento encerrado, sem nenhuma rede social com link/icone cadastrado', () => {
    beforeEach(() => montar(criarEvento({ redesSociais: [] })));

    it('escurece a imagem e informa que o evento foi encerrado, sem icones', () => {
      expect(elemento.querySelector('.imagem-principal')?.getAttribute('src')).toBe('foto-principal.jpg');
      expect(elemento.querySelector('.imagem-overlay')).toBeTruthy();
      expect(elemento.querySelector('.imagem-overlay-texto')?.textContent?.trim()).toBe('Evento encerrado');
      expect(elemento.querySelector('.rede-social-link')).toBeNull();
      expect(elemento.textContent).not.toContain('Acompanhe o que aconteceu');
    });
  });

  describe('evento ainda nao encerrado, com redes sociais cadastradas', () => {
    beforeEach(() => montar(criarEvento({ dataEvento: new Date('2099-01-01T12:00:00'), redesSociais })));

    it('nao exibe o overlay de redes sociais', () => {
      expect(elemento.querySelector('.imagem-overlay')).toBeNull();
      expect(elemento.querySelector('.rede-social-link')).toBeNull();
    });
  });

  describe('imagem principal', () => {
    it('exibe fallback com texto quando a imagem principal falha', async () => {
      await montar(criarEvento());

      falharImagemPrincipal();

      const fallback = elemento.querySelector<HTMLElement>('.imagem-principal-fallback');
      expect(fallback?.textContent).toContain('Imagem indisponível');
      expect(elemento.querySelector('.imagem-principal')).toBeNull();
    });

    it('exibe placeholder quando o evento nao tem imagem', async () => {
      await montar(criarEvento({ imagem: '' }));

      expect(elemento.querySelector('.imagem-principal')).toBeNull();
      expect(elemento.querySelector('.imagem-principal-placeholder')).toBeTruthy();
    });
  });

  describe('lightbox', () => {
    beforeEach(() => montar(criarEvento()));

    it('expande a imagem principal ao clicar nela', () => {
      expect(elemento.querySelector('.lightbox')).toBeNull();

      elemento.querySelector<HTMLImageElement>('.imagem-principal')!.click();
      fixture.detectChanges();

      const lightbox = elemento.querySelector('.lightbox');
      expect(lightbox).toBeTruthy();
      expect(lightbox?.querySelector<HTMLImageElement>('.lightbox-imagem')?.getAttribute('src')).toBe('foto-principal.jpg');
    });

    it('fecha ao clicar no botao de fechar', () => {
      elemento.querySelector<HTMLImageElement>('.imagem-principal')!.click();
      fixture.detectChanges();

      elemento.querySelector<HTMLButtonElement>('.lightbox-fechar')!.click();
      fixture.detectChanges();

      expect(elemento.querySelector('.lightbox')).toBeNull();
    });

    it('fecha ao clicar fora da imagem', () => {
      elemento.querySelector<HTMLImageElement>('.imagem-principal')!.click();
      fixture.detectChanges();

      elemento.querySelector<HTMLElement>('.lightbox')!.click();
      fixture.detectChanges();

      expect(elemento.querySelector('.lightbox')).toBeNull();
    });
  });
});
