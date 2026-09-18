import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Sobre, TITULO_CARROSSEL } from './sobre';
import { Secao, SobreService } from './sobre.service';
import { validarAno } from 'src/app/shared/utils/form-validations';

describe('Sobre', () => {
  let component: Sobre;
  let fixture: ComponentFixture<Sobre>;

  let sobreService: {
    listarSecoesAdmin: ReturnType<typeof vi.fn>;
    criarSecao: ReturnType<typeof vi.fn>;
    atualizarSecao: ReturnType<typeof vi.fn>;
    deletarSecao: ReturnType<typeof vi.fn>;
  };

  let toastr: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    sobreService = {
      listarSecoesAdmin: vi.fn().mockReturnValue(
        of({ content: [], page: { size: 50, number: 0, totalElements: 0, totalPages: 0 } }),
      ),
      criarSecao: vi.fn(),
      atualizarSecao: vi.fn(),
      deletarSecao: vi.fn(),
    };

    toastr = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Sobre],
      providers: [
        provideAnimations(),
        provideRouter([]),
        { provide: SobreService, useValue: sobreService },
        { provide: ToastrService, useValue: toastr },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Sobre);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // -----------------------------------------------------------------
  // validarAno()
  // -----------------------------------------------------------------

  describe('validarAno()', () => {
    const executar = (valor: string) => validarAno()({ value: valor } as any);

    it('rejeita texto que não é um ano', () => {
      expect(executar('Nossa fundação')).toEqual({ anoInvalido: { valor: 'Nossa fundação' } });
    });

    it('rejeita um número com menos de 4 dígitos', () => {
      expect(executar('20')).toEqual({ anoInvalido: { valor: '20' } });
    });

    it('rejeita um número com mais de 4 dígitos', () => {
      expect(executar('20155')).toEqual({ anoInvalido: { valor: '20155' } });
    });

    it('aceita um ano válido no passado', () => {
      expect(executar('1999')).toBeNull();
    });

    it('aceita um ano válido recente', () => {
      expect(executar('2024')).toBeNull();
    });
  });

  // -----------------------------------------------------------------
  // Classificação de seções da página Sobre
  // -----------------------------------------------------------------

  describe('classificarSecoes()', () => {
    const secao = (id: number, titulo: string): Secao => ({ id, titulo, ativo: true });

    it('separa corretamente texto, carrossel e história', () => {
      const secoes: Secao[] = [
        secao(1, 'Quem somos'),
        secao(2, TITULO_CARROSSEL),
        secao(3, TITULO_CARROSSEL),
        secao(4, TITULO_CARROSSEL),
        secao(5, '1999'),
        secao(6, '2010'),
      ];

      const resultado = component.classificarSecoes(secoes);

      expect(resultado.texto?.id).toBe(1);
      expect(resultado.carrossel.map((s) => s.id)).toEqual([2, 3, 4]);
      expect(resultado.historia.map((s) => s.id)).toEqual([5, 6]);
    });

    it('não classifica nenhuma seção como texto quando só existem carrossel/história', () => {
      const secoes: Secao[] = [secao(1, TITULO_CARROSSEL), secao(2, '2020')];

      const resultado = component.classificarSecoes(secoes);

      expect(resultado.texto).toBeNull();
    });
  });

  // -----------------------------------------------------------------
  // Grade fixa de 10 slots do carrossel
  // -----------------------------------------------------------------

  describe('montarSlotsCarrossel()', () => {
    const secao = (id: number): Secao => ({ id, titulo: TITULO_CARROSSEL, ativo: true });

    it('sempre produz 10 slots, mesmo recebendo menos seções da API', () => {
      const slots = component.montarSlotsCarrossel([secao(3), secao(1), secao(2)]);

      expect(slots.length).toBe(10);
      expect(slots[0]?.id).toBe(1);
      expect(slots[1]?.id).toBe(2);
      expect(slots[2]?.id).toBe(3);
      expect(slots.slice(3).every((slot) => slot === null)).toBe(true);
    });

    it('sempre produz 10 slots mesmo sem nenhuma seção de carrossel', () => {
      const slots = component.montarSlotsCarrossel([]);

      expect(slots.length).toBe(10);
      expect(slots.every((slot) => slot === null)).toBe(true);
    });

    it('nunca excede 10 slots, mesmo recebendo mais de 10 seções', () => {
      const secoes = Array.from({ length: 12 }, (_, indice) => secao(indice + 1));

      const slots = component.montarSlotsCarrossel(secoes);

      expect(slots.length).toBe(10);
    });
  });
});
