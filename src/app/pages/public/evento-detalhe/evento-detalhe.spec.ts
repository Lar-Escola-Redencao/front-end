import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { EventoDetalhe } from './evento-detalhe';
import { EventoPublicoService } from 'src/app/shared/services/evento-publico/evento-publico.service';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';
import { Evento, EventoRedeSocial, TipoEvento } from 'src/app/shared/models/evento.model';

const redesSociais: EventoRedeSocial[] = [
  { idRedeSocial: 1, nome: 'Facebook', icone: 'facebook.svg', urlLink: 'https://facebook.com/lar/post-1' },
  { idRedeSocial: 2, nome: 'Instagram', icone: 'instagram.svg', urlLink: 'https://instagram.com/p/abc' },
  { idRedeSocial: 3, nome: 'Google Drive', icone: 'drive.svg', urlLink: 'https://drive.google.com/drive/folders/xyz' }
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
    redesSociais,
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
        { provide: EventoPublicoService, useValue: { buscarPorId: () => of(evento) } },
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

  describe('com redes sociais vinculadas', () => {
    beforeEach(() => montar(criarEvento()));

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

      expect(icones.map(img => img.getAttribute('src'))).toEqual(['facebook.svg', 'instagram.svg', 'drive.svg']);
      expect(icones.map(img => img.alt)).toEqual(['Facebook', 'Instagram', 'Google Drive']);
    });

    it('abre cada link em uma nova aba', () => {
      const links = Array.from(elemento.querySelectorAll<HTMLAnchorElement>('.rede-social-link'));

      expect(links.map(a => a.getAttribute('href'))).toEqual(redesSociais.map(r => r.urlLink));
      links.forEach(a => {
        expect(a.getAttribute('target')).toBe('_blank');
        expect(a.getAttribute('rel')).toContain('noopener');
      });
    });

    it('exibe icone generico quando a imagem do icone falha', () => {
      const img = elemento.querySelector<HTMLImageElement>('.rede-social-link img')!;
      const fallback = elemento.querySelector<HTMLElement>('.rede-social-link .rede-social-fallback')!;
      expect(fallback.classList.contains('rede-social-fallback-hidden')).toBe(true);

      component.onIconeRedeError({ target: img } as unknown as Event);

      expect(img.style.display).toBe('none');
      expect(fallback.classList.contains('rede-social-fallback-hidden')).toBe(false);
    });

    it('nao renderiza carrossel de midias, lightbox nem nota pos-evento', () => {
      const seletores = [
        '.carrossel-controles',
        '.miniaturas',
        '.miniatura',
        '.imagem-principal-seta',
        '.lightbox',
        '.video-preview',
        '.evento-nota-pos'
      ];

      seletores.forEach(seletor => expect(elemento.querySelector(seletor)).toBeNull());
      expect(elemento.querySelector('.imagem-principal-wrapper')?.tagName).not.toBe('BUTTON');
    });
  });

  describe('sem redes sociais vinculadas', () => {
    beforeEach(() => montar(criarEvento({ redesSociais: [] })));

    it('exibe a imagem limpa, sem overlay, texto nem icones', () => {
      expect(elemento.querySelector('.imagem-principal')?.getAttribute('src')).toBe('foto-principal.jpg');
      expect(elemento.querySelector('.imagem-overlay')).toBeNull();
      expect(elemento.querySelector('.imagem-overlay-texto')).toBeNull();
      expect(elemento.querySelector('.rede-social-link')).toBeNull();
      expect(elemento.textContent).not.toContain('Acompanhe o que aconteceu');
    });
  });

  describe('evento sem a propriedade redesSociais', () => {
    beforeEach(() => montar(criarEvento({ redesSociais: undefined })));

    it('nao exibe overlay', () => {
      expect(elemento.querySelector('.imagem-overlay')).toBeNull();
    });
  });

  describe('imagem principal', () => {
    it('usa url_imagem_drive quando existir', async () => {
      await montar(criarEvento({ urlImagemDrive: 'https://drive.example/capa.jpg' }));

      expect(elemento.querySelector('.imagem-principal')?.getAttribute('src')).toBe('https://drive.example/capa.jpg');
    });

    it('volta para a imagem principal quando a imagem do Drive falha', async () => {
      await montar(criarEvento({ urlImagemDrive: 'https://drive.example/capa.jpg' }));

      falharImagemPrincipal();

      expect(elemento.querySelector('.imagem-principal')?.getAttribute('src')).toBe('foto-principal.jpg');
      expect(elemento.querySelector('.imagem-principal-fallback')).toBeNull();
    });

    it('exibe fallback com texto quando a imagem principal falha', async () => {
      await montar(criarEvento());

      falharImagemPrincipal();

      const fallback = elemento.querySelector<HTMLElement>('.imagem-principal-fallback');
      expect(fallback?.textContent).toContain('Imagem indisponível');
      expect(elemento.querySelector('.imagem-principal')).toBeNull();
    });

    it('exibe placeholder quando o evento nao tem imagem', async () => {
      await montar(criarEvento({ imagem: '', redesSociais: [] }));

      expect(elemento.querySelector('.imagem-principal')).toBeNull();
      expect(elemento.querySelector('.imagem-principal-placeholder')).toBeTruthy();
    });
  });
});
