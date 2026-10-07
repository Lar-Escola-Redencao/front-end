import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { Sobre } from './sobre';
import {
  ConteudoSobre,
  SobrePublicoService,
} from 'src/app/shared/services/sobre/sobre-publico.service';

@Component({ selector: 'app-public-navbar', template: '' })
class NavbarTeste {}
@Component({ selector: 'app-public-footer', template: '' })
class FooterTeste {}
@Component({ selector: 'app-public-diretoria', template: '' })
class DiretoriaTeste {}
@Component({ selector: 'app-public-unidades', template: '' })
class UnidadesTeste {}

describe('Sobre', () => {
  let fixture: ComponentFixture<Sobre>;
  let resposta: Subject<ConteudoSobre>;
  let service: {
    obterConteudo: ReturnType<typeof vi.fn>;
    obterTotalUnidades: ReturnType<typeof vi.fn>;
    obterIndicadores: ReturnType<typeof vi.fn>;
  };
  const dados: ConteudoSobre = {
    texto: [
      {
        id: 1,
        titulo: 'Sobre o Lar Escola Redenção',
        conteudo: '<p>Missão cadastrada no CMS</p>',
        grupo: 'texto-sobre',
        ativo: true,
      },
    ],
    historia: [
      {
        id: 2,
        titulo: '1978',
        conteudo: 'Fundação da instituição',
        imagem: '/fundacao.jpg',
        ativo: true,
      },
      {
        id: 3,
        titulo: '1995',
        conteudo: 'Ampliação das atividades',
        imagem: '/ampliacao.jpg',
        ativo: true,
      },
    ],
    carrossel: [{ id: 4, titulo: 'Imagem Carrossel', imagem: '/atividades.jpg', ativo: true }],
  };

  beforeEach(async () => {
    resposta = new Subject<ConteudoSobre>();
    service = {
      obterConteudo: vi.fn(() => resposta.asObservable()),
      obterTotalUnidades: vi.fn(() => of(3)),
      obterIndicadores: vi.fn(() => of({ totalMeninos: 97, dataFundacao: '1978-08-29' })),
    };
    await TestBed.configureTestingModule({
      imports: [Sobre],
      providers: [
        { provide: SobrePublicoService, useValue: service },
        { provide: ActivatedRoute, useValue: { snapshot: { fragment: null } } },
      ],
    })
      .overrideComponent(Sobre, {
        set: { imports: [NavbarTeste, FooterTeste, DiretoriaTeste, UnidadesTeste] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(Sobre);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  function carregar(conteudo: ConteudoSobre = dados): HTMLElement {
    resposta.next(conteudo);
    resposta.complete();
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('exibe o carregamento enquanto aguarda o CMS', () => {
    const pagina: HTMLElement = fixture.nativeElement;
    expect(pagina.querySelector('[role="status"]')?.textContent).toContain('Carregando');
    expect(pagina.querySelector('main')?.getAttribute('aria-busy')).toBe('true');
    expect(pagina.querySelector('app-public-unidades')).toBeNull();
    expect(pagina.querySelector('app-public-diretoria')).toBeNull();
  });

  it.each([
    ['2026-08-28T12:00:00', '47'],
    ['2026-08-29T12:00:00', '48'],
    ['2027-01-01T12:00:00', '48'],
  ])('exibe o total atual de 97 meninos e calcula anos completos em %s', (data, idade) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(data));
    fixture.destroy();
    fixture = TestBed.createComponent(Sobre);
    fixture.detectChanges();
    const pagina = carregar();
    expect(pagina.querySelector('.numero-atendidos strong')?.textContent).toBe('97');
    expect(pagina.querySelector('.numero-anos strong')?.textContent).toBe(idade);
  });

  it('renderiza textos, imagens e o total de unidades recebidos', () => {
    const pagina = carregar();
    expect(pagina.querySelector('.texto-institucional')?.textContent).toContain(
      'Missão cadastrada no CMS',
    );
    expect(pagina.querySelector('.mosaico img')?.getAttribute('src')).toBe('/atividades.jpg');
    expect(pagina.querySelector('.numero-unidades strong')?.textContent).toBe('3');
    expect(pagina.querySelector('main')?.getAttribute('aria-busy')).toBe('false');
  });

  it('troca o marco histórico e bloqueia as setas nas extremidades', () => {
    const pagina = carregar();
    const anterior = pagina.querySelector<HTMLButtonElement>('[aria-label="Marco anterior"]')!;
    const proximo = pagina.querySelector<HTMLButtonElement>('[aria-label="Próximo marco"]')!;
    const anos = pagina.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    anos.forEach((ano) => {
      ano.scrollIntoView = vi.fn();
    });
    expect(anterior.disabled).toBe(true);
    proximo.click();
    fixture.detectChanges();
    expect(pagina.querySelector('.historia-descricao')?.textContent).toBe(
      'Ampliação das atividades',
    );
    expect(anos[1].getAttribute('aria-selected')).toBe('true');
    expect(proximo.disabled).toBe(true);
    expect(anterior.disabled).toBe(false);
  });

  it('repete as dez imagens para um ciclo contínuo sem controle de pausa', () => {
    const carrossel = Array.from({ length: 10 }, (_, indice) => ({
      id: indice + 10,
      titulo: 'Foto',
      imagem: `/foto-${indice}.jpg`,
      ativo: true,
    }));
    const pagina = carregar({ ...dados, carrossel });
    const grupos = pagina.querySelectorAll('.mosaico-grupo');
    expect(grupos.length).toBe(2);
    expect(grupos[0].querySelectorAll('img').length).toBe(10);
    expect(grupos[1].getAttribute('aria-hidden')).toBe('true');
    expect(pagina.querySelector('.mosaico button')).toBeNull();
    expect(pagina.querySelector('.mosaico')?.classList.contains('mosaico-animado')).toBe(true);
    expect(
      pagina.querySelector('.historia-ano')?.parentElement?.classList.contains('historia-card'),
    ).toBe(true);
  });

  it('permite navegar na linha do tempo pelo teclado', () => {
    const pagina = carregar();
    const anos = pagina.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    anos.forEach((ano) => {
      ano.scrollIntoView = vi.fn();
    });
    anos[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    fixture.detectChanges();
    expect(anos[1].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(anos[1]);
    anos[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    fixture.detectChanges();
    expect(anos[0].getAttribute('aria-selected')).toBe('true');
  });

  it('mostra mensagem amigável e permite tentar novamente após uma falha', () => {
    resposta.error(new Error('Falha HTTP'));
    fixture.detectChanges();
    const pagina: HTMLElement = fixture.nativeElement;
    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível');
    expect(pagina.querySelector('app-public-unidades')).toBeNull();
    expect(pagina.querySelector('app-public-diretoria')).toBeNull();
    resposta = new Subject<ConteudoSobre>();
    service.obterConteudo.mockReturnValue(resposta.asObservable());
    pagina.querySelector<HTMLButtonElement>('.estado-pagina button')!.click();
    fixture.detectChanges();
    expect(service.obterConteudo).toHaveBeenCalledTimes(2);
    expect(pagina.querySelector('[role="status"]')).not.toBeNull();
    carregar();
    expect(pagina.querySelector('[role="alert"]')).toBeNull();
    expect(pagina.querySelector('app-public-unidades')).not.toBeNull();
    expect(pagina.querySelector('app-public-diretoria')).not.toBeNull();
  });

  it('trata uma página sem textos ou marcos cadastrados', () => {
    const pagina = carregar({ texto: [], historia: [], carrossel: [] });
    expect(pagina.textContent).toContain(
      'As informações institucionais estarão disponíveis em breve',
    );
    expect(pagina.textContent).toContain('Nossa história estará disponível em breve');
    expect(pagina.querySelector('.mosaico')).toBeNull();
  });

  it('exibe fallback quando uma foto não pode ser carregada', () => {
    const pagina = carregar();
    pagina.querySelector<HTMLImageElement>('.mosaico img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(pagina.querySelector('.mosaico img')).toBeNull();
    expect(pagina.querySelector('.mosaico [aria-label="Imagem indisponível"]')).not.toBeNull();
  });
});
