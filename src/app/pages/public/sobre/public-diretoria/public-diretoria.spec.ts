import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { PublicDiretoriaComponent } from './public-diretoria';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';

describe('Diretoria pública com um registro', () => {
  afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); });
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
});
