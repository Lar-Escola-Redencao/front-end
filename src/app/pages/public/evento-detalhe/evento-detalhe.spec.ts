import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { EventoDetalhe } from './evento-detalhe';
import { EventoPublicoService } from 'src/app/shared/services/evento-publico/evento-publico.service';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';
import { TipoEvento } from 'src/app/shared/models/evento.model';

describe('EventoDetalhe', () => {
  let fixture: ComponentFixture<EventoDetalhe>;
  let component: EventoDetalhe;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventoDetalhe],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => '1'
              }
            }
          }
        },
        {
          provide: EventoPublicoService,
          useValue: {
            buscarPorId: () => of({
              id: 1,
              titulo: 'Evento teste',
              descricao: 'Descricao',
              dataEvento: new Date('2099-01-01T12:00:00'),
              endereco: 'Rua teste',
              imagem: 'foto-principal.jpg',
              tipoEvento: TipoEvento.CULTURAL,
              parceiros: [],
              midiaEvento: [
                { url: 'video-1.mp4', tipo: 'VIDEO' },
                { url: 'foto-2.jpg', tipo: 'IMAGEM' },
                { url: 'foto-3.jpg', tipo: 'IMAGEM' },
                { url: 'foto-4.jpg', tipo: 'IMAGEM' },
                { url: 'foto-5.jpg', tipo: 'IMAGEM' },
                { url: 'foto-6.jpg', tipo: 'IMAGEM' },
                { url: 'foto-7.jpg', tipo: 'IMAGEM' },
                { url: 'foto-8.jpg', tipo: 'IMAGEM' },
                { url: 'foto-9.jpg', tipo: 'IMAGEM' }
              ]
            })
          }
        },
        {
          provide: PublicContentService,
          useValue: {
            tratarUrlImagem: (url: string | null | undefined) => url ?? ''
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EventoDetalhe);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('mantem os chevrons sobre a imagem principal e fora do carrossel de previews', () => {
    const elemento: HTMLElement = fixture.nativeElement;

    expect(elemento.querySelectorAll('.imagem-principal-seta').length).toBe(2);
    expect(elemento.querySelectorAll('.miniaturas .carrossel-seta').length).toBe(0);
    expect(elemento.querySelectorAll('.miniatura').length).toBe(10);
  });

  it('centraliza a miniatura ativa quando a midia muda', () => {
    vi.useFakeTimers();
    const scrollIntoView = vi.fn();
    const miniatura = {
      nativeElement: {
        scrollIntoView
      }
    };

    component.miniaturasPreview.reset([miniatura] as never);
    component.selecionarMidia(0);
    vi.runAllTimers();

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });
    vi.useRealTimers();
  });

  it('exibe fallback cinza com icone de imagem quando o preview falha', () => {
    const elemento: HTMLElement = fixture.nativeElement;
    const primeiraImagem = elemento.querySelector<HTMLImageElement>('.miniatura img');
    const primeiroFallback = elemento.querySelector<HTMLElement>('.miniatura .miniatura-fallback');

    component.onMiniaturaImageError({ target: primeiraImagem } as unknown as Event);
    fixture.detectChanges();

    expect(primeiraImagem?.style.display).toBe('none');
    expect(primeiroFallback?.classList.contains('miniatura-fallback-hidden')).toBe(false);
    expect(primeiroFallback?.textContent?.trim()).toBe('image');
  });

  it('exibe fallback com texto quando a midia principal falha', () => {
    component.onMidiaPrincipalError();
    fixture.detectChanges();

    const elemento: HTMLElement = fixture.nativeElement;
    const fallback = elemento.querySelector<HTMLElement>('.imagem-principal-fallback');

    expect(fallback?.textContent).toContain('image');
    expect(fallback?.textContent).toContain('Mídia indisponível');
  });
  it('mostra capa e indicador de play para video sem controles no preview principal', () => {
    component.selecionarMidia(1);
    fixture.detectChanges();

    const elemento: HTMLElement = fixture.nativeElement;
    const videoPreview = elemento.querySelector<HTMLVideoElement>('.imagem-principal-wrapper video');

    expect(videoPreview?.controls).toBe(false);
    expect(videoPreview?.getAttribute('src')).toBe('video-1.mp4');
    expect(elemento.querySelector('.video-preview-play')).toBeTruthy();
  });

  it('renderiza video com controles apenas no lightbox', () => {
    component.selecionarMidia(1);
    component.abrirLightbox();
    fixture.detectChanges();

    const elemento: HTMLElement = fixture.nativeElement;
    const video = elemento.querySelector<HTMLVideoElement>('.lightbox-video');

    expect(video?.controls).toBe(true);
    expect(video?.getAttribute('src')).toBe('video-1.mp4');
  });

  it('pausa o video do lightbox antes de trocar de midia', () => {
    const pause = vi.fn();

    component.lightboxAberto = true;
    component.lightboxVideo = {
      nativeElement: {
        pause
      }
    } as never;

    component.selecionarMidia(2);

    expect(pause).toHaveBeenCalled();
  });
});
