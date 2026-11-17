import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { PublicDiretoriaComponent } from './public-diretoria';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';

describe('Diretoria pública', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it('centraliza o único membro sem deslocamento de carrossel ou setas', () => {
    vi.stubGlobal('innerWidth', 1200);
    TestBed.configureTestingModule({ providers: [{ provide: PublicContentService, useValue: {
      getDiretoriaAtiva: () => of([{ id: 1, nome: 'Diretora', cargo: 'Presidente', ativo: true }]),
      tratarUrlImagem: () => '',
    } }] });
    const fixture = TestBed.createComponent(PublicDiretoriaComponent); fixture.detectChanges();
    expect(fixture.componentInstance.trackTransform).toBe('translateX(0)');
    expect(fixture.nativeElement.querySelector('.carousel-container.registro-unico')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.diretor-card').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.nav-btn').length).toBe(0);
  });

  it.each([360, 1200])('mantém as dimensões dos cards ao navegar na largura %s', largura => {
    vi.useFakeTimers();
    vi.stubGlobal('innerWidth', largura);
    TestBed.configureTestingModule({ providers: [{ provide: PublicContentService, useValue: {
      getDiretoriaAtiva: () => of([
        { id: 1, nome: 'Diretora', cargo: 'Presidente', ativo: true },
        { id: 2, nome: 'Outro membro', cargo: 'Vice-presidente', ativo: true },
      ]),
      tratarUrlImagem: () => '',
    } }] });
    const fixture = TestBed.createComponent(PublicDiretoriaComponent);
    fixture.detectChanges();
    const elemento: HTMLElement = fixture.nativeElement;
    const card = elemento.querySelector<HTMLElement>('.diretor-card')!;
    const foto = card.querySelector<HTMLElement>('.foto-wrapper')!;
    const estilo = getComputedStyle(card);
    expect(estilo.width).toBe('320px');
    expect(estilo.height).toBe('400px');
    expect(getComputedStyle(foto).height).toBe('280px');
    expect(getComputedStyle(elemento.querySelector('.nav-btn')!).position).toBe('absolute');

    fixture.componentInstance.next();
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(getComputedStyle(card).width).toBe('320px');
    expect(getComputedStyle(card).height).toBe('400px');
    expect(elemento.querySelector('.center-card')).not.toBeNull();
    expect(elemento.querySelector('.side-card') !== null).toBe(largura >= 900);
    fixture.destroy();
    vi.useRealTimers();
  });
});
