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

    it('aceita qualquer ano com exatamente 4 dígitos', () => {
      expect(executar('1111')).toBeNull();
      expect(executar('2424')).toBeNull();
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

  // -----------------------------------------------------------------
  // Arquivo escolhido pra um slot do carrossel
  // -----------------------------------------------------------------

  describe('onArquivoSlotSelecionado()', () => {
    const selecionar = (arquivo: File, indice: number) => {
      const input = { files: [arquivo], value: arquivo.name };
      component.onArquivoSlotSelecionado({ target: input } as unknown as Event, indice);
      return input;
    };

    it('nenhum slot mostra erro antes de alguém tentar enviar um arquivo', () => {
      expect(component.erroSlot.every((erro) => erro === null)).toBe(true);
    });

    it('mostra os formatos aceitos só no slot que recebeu um formato inválido, sem enviar nada', () => {
      const input = selecionar(new File(['x'], 'animacao.gif', { type: 'image/gif' }), 2);

      expect(component.erroSlot[2]).toBe('Formato de arquivo inválido. Use PNG, JPEG, JPG ou WEBP.');
      expect(component.erroSlot.filter((erro) => erro !== null).length).toBe(1);
      expect(input.value).toBe('');
      expect(sobreService.criarSecao).not.toHaveBeenCalled();
      expect(sobreService.atualizarSecao).not.toHaveBeenCalled();
    });

    it('mostra o limite de tamanho quando a imagem passa de 10MB', () => {
      const arquivo = new File(['x'], 'grande.png', { type: 'image/png' });
      Object.defineProperty(arquivo, 'size', { value: 11 * 1024 * 1024 });

      selecionar(arquivo, 0);

      expect(component.erroSlot[0]).toBe('O arquivo deve ter no máximo 10MB.');
      expect(sobreService.criarSecao).not.toHaveBeenCalled();
    });

    it('limpa o erro do slot quando depois é escolhida uma imagem válida', () => {
      sobreService.criarSecao.mockReturnValue(of({ id: 1, titulo: TITULO_CARROSSEL, ativo: true }));
      selecionar(new File(['x'], 'animacao.gif', { type: 'image/gif' }), 2);

      selecionar(new File(['x'], 'foto.png', { type: 'image/png' }), 2);

      expect(component.erroSlot[2]).toBeNull();
      expect(sobreService.criarSecao).toHaveBeenCalledTimes(1);
    });
  });
});
