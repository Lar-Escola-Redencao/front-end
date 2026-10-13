import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { vi } from 'vitest';

import { BarraBusca, DEBOUNCE_BUSCA_MS } from './barra-busca';

describe('BarraBusca', () => {
  let fixture: ComponentFixture<BarraBusca>;
  let component: BarraBusca;
  let emitidos: string[];

  beforeEach(async () => {
    vi.useFakeTimers();

    await TestBed.configureTestingModule({
      imports: [BarraBusca],
      providers: [provideAnimations()]
    }).compileComponents();

    fixture = TestBed.createComponent(BarraBusca);
    component = fixture.componentInstance;
    emitidos = [];
    component.buscar.subscribe(termo => emitidos.push(termo));
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('só emite 500ms depois que o usuário para de digitar', () => {
    component.controle.setValue('a');
    vi.advanceTimersByTime(300);
    component.controle.setValue('an');
    vi.advanceTimersByTime(300);
    component.controle.setValue('ana');

    vi.advanceTimersByTime(DEBOUNCE_BUSCA_MS - 1);
    expect(emitidos).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(emitidos).toEqual(['ana']);
  });

  it('remove espaços das pontas e não repete o mesmo termo', () => {
    component.controle.setValue('  ana ');
    vi.advanceTimersByTime(DEBOUNCE_BUSCA_MS);
    component.controle.setValue('ana');
    vi.advanceTimersByTime(DEBOUNCE_BUSCA_MS);

    expect(emitidos).toEqual(['ana']);
  });

  it('emite string vazia ao limpar a busca', () => {
    component.controle.setValue('ana');
    vi.advanceTimersByTime(DEBOUNCE_BUSCA_MS);
    component.limpar();
    vi.advanceTimersByTime(DEBOUNCE_BUSCA_MS);

    expect(emitidos).toEqual(['ana', '']);
  });

  it('preenche o campo com o valor vindo da URL sem disparar nova busca', () => {
    component.valor = 'maria';
    vi.advanceTimersByTime(DEBOUNCE_BUSCA_MS);

    expect(component.controle.value).toBe('maria');
    expect(emitidos).toEqual([]);
  });

  it('permite buscar de novo o mesmo termo depois que a URL foi limpa', () => {
    component.controle.setValue('ana');
    vi.advanceTimersByTime(DEBOUNCE_BUSCA_MS);

    // Ex.: troca de aba remove ?search= e reseta o campo.
    component.valor = '';
    component.controle.setValue('ana');
    vi.advanceTimersByTime(DEBOUNCE_BUSCA_MS);

    expect(emitidos).toEqual(['ana', 'ana']);
  });
});
