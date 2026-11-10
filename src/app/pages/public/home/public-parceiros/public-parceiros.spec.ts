import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { PublicParceirosComponent } from './public-parceiros';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';

describe('Ampliação dos parceiros na página inicial', () => {
  let fixture: ComponentFixture<PublicParceirosComponent>;
  let elemento: HTMLElement;
  let dialog: HTMLDialogElement;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [{
      provide: PublicContentService,
      useValue: {
        getParceirosAtivos: () => of([
          { id: 1, nome: 'Parceiro A', logo: '/logo-a.png' },
          { id: 2, nome: 'Parceiro B', logo: '' },
        ]),
        tratarUrlImagem: (url: string) => url,
      },
    }] });
    fixture = TestBed.createComponent(PublicParceirosComponent);
    fixture.detectChanges();
    elemento = fixture.nativeElement;
    dialog = elemento.querySelector('dialog')!;
    dialog.showModal = () => dialog.setAttribute('open', '');
    dialog.close = () => {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    };
  });

  afterEach(() => {
    fixture.destroy();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('abre a imagem escolhida, pausa o carrossel e fecha ao clicar no fundo', () => {
    const proximo = vi.spyOn(fixture.componentInstance, 'next');
    elemento.querySelector<HTMLButtonElement>('[aria-label="Ampliar imagem de Parceiro A"]')!.click();
    fixture.detectChanges();
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('img')?.getAttribute('src')).toBe('/logo-a.png');
    expect(dialog.querySelector('img')?.alt).toBe('Parceiro A');
    expect(document.body.style.overflow).toBe('hidden');
    vi.advanceTimersByTime(3000);
    expect(proximo).not.toHaveBeenCalled();

    dialog.querySelector('img')!.click();
    expect(dialog.open).toBe(true);
    dialog.click();
    fixture.detectChanges();
    expect(dialog.open).toBe(false);
    expect(fixture.componentInstance.parceiroAmpliado).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('limpa a imagem ao fechar pelo controle nativo do diálogo', () => {
    elemento.querySelector<HTMLButtonElement>('[aria-label="Ampliar imagem de Parceiro A"]')!.click();
    dialog.close();
    fixture.detectChanges();
    expect(fixture.componentInstance.parceiroAmpliado).toBeNull();
    expect(dialog.querySelector('img')).toBeNull();
  });

  it('impede ampliar uma imagem ausente ou que falhou ao carregar', () => {
    expect(elemento.querySelector<HTMLButtonElement>('[aria-label="Ampliar imagem de Parceiro B"]')!.disabled).toBe(true);
    elemento.querySelector<HTMLImageElement>('.logo-wrapper img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    const botoes = elemento.querySelectorAll<HTMLButtonElement>('[aria-label="Ampliar imagem de Parceiro A"]');
    expect(Array.from(botoes).every(botao => botao.disabled)).toBe(true);
    expect(dialog.open).toBe(false);
  });
});
