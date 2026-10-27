import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { environment } from 'src/environments/environment';
import { Secao } from 'src/app/shared/services/pagina/pagina-cms.service';
import { Grafica, normalizarTelefoneWhatsapp } from './grafica';

describe('normalizarTelefoneWhatsapp', () => {
  it('adds the country code to national numbers, including DDD 55', () => {
    expect(normalizarTelefoneWhatsapp('(55) 99999-8888')).toBe('5555999998888');
    expect(normalizarTelefoneWhatsapp('(55) 3222-1111')).toBe('555532221111');
    expect(normalizarTelefoneWhatsapp('(11) 98765-4321')).toBe('5511987654321');
  });

  it('keeps numbers that already have the country code', () => {
    expect(normalizarTelefoneWhatsapp('+55 55 99999-8888')).toBe('5555999998888');
    expect(normalizarTelefoneWhatsapp('+55 (11) 98765-4321')).toBe('5511987654321');
    expect(normalizarTelefoneWhatsapp('55 11 3222-1111')).toBe('551132221111');
  });

  it('ignores the trunk prefix 0', () => {
    expect(normalizarTelefoneWhatsapp('0 (55) 99999-8888')).toBe('5555999998888');
  });

  it('returns null for empty or invalid numbers', () => {
    expect(normalizarTelefoneWhatsapp(null)).toBeNull();
    expect(normalizarTelefoneWhatsapp('   ')).toBeNull();
    expect(normalizarTelefoneWhatsapp('9999-8888')).toBeNull();
  });
});

describe('Grafica', () => {
  let fixture: ComponentFixture<Grafica>;
  let httpMock: HttpTestingController;
  const url = `${environment.apiUrl}/paginas/3/secoes`;

  const secoesMock: Secao[] = [
    { id: 1, titulo: 'Cartões de visita', grupo: 'nenhum', ordem: 1, ativo: true },
    { id: 2, titulo: '(55) 99999-8888', grupo: 'telefone', conteudo: 'grafica@exemplo.com', ativo: true },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('innerWidth', 1600);
    TestBed.configureTestingModule({
      imports: [Grafica],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    fixture = TestBed.createComponent(Grafica);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function carregarProdutos(quantidade: number) {
    httpMock.expectOne(url).flush(Array.from({ length: quantidade }, (_, i) => ({
      id: i + 1, titulo: `Produto ${i + 1}`, grupo: 'nenhum', ativo: true, ordem: i,
      imagem: `/images/produto-${i + 1}.jpg`
    })));
    fixture.detectChanges();
    return fixture.componentInstance as any;
  }

  it('exibe as setas com cinco produtos e repete a sequência nos dois sentidos', () => {
    const component = carregarProdutos(5);
    const section = fixture.nativeElement.querySelector('.carrossel-section');
    section.dispatchEvent(new Event('mouseenter'));
    expect(section.querySelectorAll('.nav-btn').length).toBe(2);
    const atual = () => component.produtosCarrossel()[component.indiceAtual()].id;
    expect(atual()).toBe(1);
    section.querySelector('.prev-btn').click();
    vi.advanceTimersByTime(550);
    expect(atual()).toBe(5);
    for (const esperado of [1, 2, 3, 4, 5, 1, 2]) {
      section.querySelector('.next-btn').click();
      expect(component.produtosCarrossel().slice(component.indiceAtual(),
        component.indiceAtual() + component.itensPorPagina()).length).toBe(component.itensPorPagina());
      vi.advanceTimersByTime(550);
      expect(atual()).toBe(esperado);
    }
  });

  it('centraliza quatro produtos sem loop no desktop e ativa navegação no mobile', () => {
    const component = carregarProdutos(4);
    expect(fixture.nativeElement.querySelector('.nav-btn')).toBeNull();
    expect(component.produtosCarrossel().length).toBe(4);
    vi.stubGlobal('innerWidth', 390);
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.nav-btn').length).toBe(2);
    expect(component.itensPorPagina()).toBe(1);
  });

  it('adapta a quantidade de produtos ao espaço e exibe mais de cinco em telas maiores', () => {
    const component = carregarProdutos(8);
    const largo = component.itensPorPagina();
    expect(largo).toBeGreaterThan(5);
    vi.stubGlobal('innerWidth', 2560);
    window.dispatchEvent(new Event('resize'));
    expect(component.itensPorPagina()).toBeGreaterThan(largo);
    vi.stubGlobal('innerWidth', 1200);
    window.dispatchEvent(new Event('resize'));
    expect(component.itensPorPagina()).toBeLessThan(largo);
    vi.stubGlobal('innerWidth', 390);
    window.dispatchEvent(new Event('resize'));
    expect(component.itensPorPagina()).toBe(1);
  });

  it('repete imagens suficientes para preencher uma tela larga mesmo com cinco produtos', () => {
    const component = carregarProdutos(5);
    vi.stubGlobal('innerWidth', 3840);
    window.dispatchEvent(new Event('resize'));
    const finalDoLoop = 10;
    expect(component.produtosCarrossel().slice(finalDoLoop,
      finalDoLoop + component.itensPorPagina()).length).toBe(component.itensPorPagina());
  });

  it('gira automaticamente, pausa durante interação e cancela o timer ao sair', () => {
    const component = carregarProdutos(5);
    const section = fixture.nativeElement.querySelector('.carrossel-section');
    const inicial = component.indiceAtual();
    vi.advanceTimersByTime(3000);
    expect(component.indiceAtual()).toBe(inicial + 1);
    vi.advanceTimersByTime(550);
    section.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(6000);
    expect(component.indiceAtual()).toBe(inicial + 1);
    section.dispatchEvent(new Event('mouseleave'));
    vi.advanceTimersByTime(3000);
    expect(component.indiceAtual()).toBe(inicial + 2);
    fixture.destroy();
    const final = component.indiceAtual();
    vi.advanceTimersByTime(6000);
    expect(component.indiceAtual()).toBe(final);
  });

  it('abre a imagem completa e permite fechar pelo fundo', () => {
    carregarProdutos(5);
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = () => dialog.setAttribute('open', '');
    dialog.close = () => { dialog.removeAttribute('open'); dialog.dispatchEvent(new Event('close')); };
    fixture.nativeElement.querySelector('.produto-card:not([inert]) .produto-imagem-wrapper').click();
    fixture.detectChanges();
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.querySelector('img')!.getAttribute('src')).toBe('/images/produto-1.jpg');
    dialog.click();
    fixture.detectChanges();
    expect(dialog.hasAttribute('open')).toBe(false);
  });

  it('renders products and a WhatsApp link with the country code for DDD 55', () => {
    httpMock.expectOne(url).flush(secoesMock);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.produto-card').length).toBe(1);
    expect(el.querySelector<HTMLAnchorElement>('.btn-whatsapp')?.href).toContain(
      'https://wa.me/5555999998888?text=',
    );
    const whatsapp = new URL(el.querySelector<HTMLAnchorElement>('.btn-whatsapp')!.href);
    expect(whatsapp.searchParams.get('text')).toBe('Olá! Encontrei o contato de vocês pelo site e gostaria de solicitar um orçamento de serviços gráficos.');
    expect(el.querySelector('.contato-alternativo a')?.getAttribute('href')).toBe('mailto:grafica@exemplo.com');
  });

  it('abre o telefone alternativo no discador e mantém o número formatado', () => {
    httpMock.expectOne(url).flush([{ ...secoesMock[1], conteudo: '(16) 98855-0240' }]);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('.contato-alternativo a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('tel:16988550240');
    expect(link.textContent).toBe('(16) 98855-0240');
  });

  it('leaves the loading state and shows the empty message when the API returns null', () => {
    httpMock.expectOne(url).flush(null);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.spinner')).toBeNull();
    expect(el.querySelector('.mensagem-vazia')).not.toBeNull();
    expect(el.querySelector('.contato-section')).toBeNull();
  });
});
