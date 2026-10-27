import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { Clipboard } from '@angular/cdk/clipboard';

import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { PublicFooter } from '@components/public-footer/public-footer';

import { environment } from 'src/environments/environment';
import { SecaoGrupo } from 'src/app/shared/services/pagina/secoes-grupo.service';
import { ComoAjudar } from './como-ajudar';

@Component({
  selector: 'app-public-navbar',
  standalone: true,
  template: '<nav class="navbar"></nav>',
})
class PublicNavbarStub {}

@Component({
  selector: 'app-public-footer',
  standalone: true,
  template: '',
})
class PublicFooterStub {}

describe('ComoAjudar', () => {
  let fixture: ComponentFixture<ComoAjudar>;
  let httpMock: HttpTestingController;
  let elemento: HTMLElement;

  const endpoint = `${environment.apiUrl}/paginas/4/secoes`;

  const pix: SecaoGrupo = {
    id: 10,
    grupo: 'pix',
    titulo: null,
    conteudo: 'doacoes@lar.org',
    imagem: '/uploads/paginas/4/qrcode.png',
    ativo: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComoAjudar],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    })
      .overrideComponent(ComoAjudar, {
        remove: {
          imports: [PublicNavbar, PublicFooter],
        },
        add: {
          imports: [PublicNavbarStub, PublicFooterStub],
        },
      })
      .compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ComoAjudar);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function responder(secoes: SecaoGrupo[]): void {
    const requisicao = httpMock.expectOne(endpoint);
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(secoes);
    fixture.detectChanges();
  }

  it('exibe o carregamento enquanto consulta as informações', () => {
    expect(elemento.querySelector('[role="status"]')?.textContent).toContain(
      'Carregando informações de doação',
    );
    expect(elemento.querySelector('#pix')).toBeNull();

    responder([]);
  });

  it('exibe a chave e a imagem do Pix ativo retornadas pela API', () => {
    responder([pix]);

    expect(elemento.querySelector('#pix')).not.toBeNull();
    expect(elemento.querySelector('.chave-pix-valor')?.textContent).toContain(
      pix.conteudo,
    );
    expect(
      elemento.querySelector<HTMLImageElement>('.pix-imagem img')?.getAttribute('src'),
    ).toBe(`${environment.apiUrl}${pix.imagem}`);
  });

  it('direciona a chamada de doação para o Pix na página Como ajudar', () => {
    responder([pix]);

    const link = elemento.querySelector<HTMLAnchorElement>('.abertura-botao');

    expect(link?.getAttribute('href')).toBe('/como-ajudar#pix');
    expect(link?.textContent).toContain('Quero contribuir');
  });

  it('copia a chave inteira pelo botão e mostra uma confirmação temporária', () => {
    vi.useFakeTimers();
    responder([pix]);
    const copiar = vi.spyOn(TestBed.inject(Clipboard), 'copy').mockReturnValue(true);
    elemento.querySelector<HTMLButtonElement>('.chave-pix-copiar')!.click();
    fixture.detectChanges();
    expect(copiar).toHaveBeenCalledWith(pix.conteudo);
    expect(elemento.querySelector('.chave-pix-feedback')?.textContent).toContain('Chave Pix copiada!');
    expect(elemento.querySelector('.chave-pix-copiar .material-symbols-outlined')?.textContent?.trim()).toBe('check');
    vi.advanceTimersByTime(2500);
    fixture.detectChanges();
    expect(elemento.querySelector('.chave-pix-feedback')?.textContent?.trim()).toBe('');
  });

  it('informa quando não consegue copiar e mantém a chave disponível', () => {
    responder([pix]);
    vi.spyOn(TestBed.inject(Clipboard), 'copy').mockReturnValue(false);
    elemento.querySelector<HTMLButtonElement>('.chave-pix-copiar')!.click();
    fixture.detectChanges();
    expect(elemento.querySelector('.chave-pix-feedback')?.textContent).toContain('Não foi possível copiar');
    expect(elemento.querySelector('.chave-pix-valor')?.textContent).toContain(pix.conteudo);
  });

  it.each([82, 106])('posiciona o card abaixo da navegação de %i px sem executar o salto nativo', altura => {
    responder([pix]);
    const navbar = elemento.querySelector<HTMLElement>('app-public-navbar .navbar')!;
    const secao = elemento.querySelector<HTMLElement>('#pix')!;
    vi.spyOn(navbar, 'getBoundingClientRect').mockReturnValue({ bottom: altura } as DOMRect);
    vi.spyOn(secao, 'getBoundingClientRect').mockReturnValue({ top: 500 } as DOMRect);
    const rolar = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true });
    elemento.querySelector('.abertura-botao')!.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(true);
    expect(rolar).toHaveBeenCalledWith({ top: 500 + window.scrollY - altura - 8, behavior: 'smooth' });
  });

  it('preserva o endereço absoluto da imagem', () => {
    const imagem = 'https://exemplo.org/qrcode.png';

    responder([{ ...pix, imagem }]);

    expect(
      elemento.querySelector<HTMLImageElement>('.pix-imagem img')?.getAttribute('src'),
    ).toBe(imagem);
  });

  it('oculta toda a seção quando o Pix está inativo', () => {
    responder([{ ...pix, ativo: false }]);

    expect(elemento.querySelector('#pix')).toBeNull();
    expect(elemento.querySelector('.chave-pix')).toBeNull();
    expect(elemento.querySelector('.pix-imagem')).toBeNull();
    expect(elemento.querySelector('.abertura-botao')).toBeNull();
    expect(elemento.textContent).not.toContain(pix.conteudo);
    expect(elemento.querySelector('#imposto-de-renda')).not.toBeNull();
    expect(elemento.querySelector('#notas-fiscais')).not.toBeNull();
  });

  it('oculta a seção quando não existe Pix cadastrado', () => {
    responder([]);

    expect(elemento.querySelector('#pix')).toBeNull();
    expect(elemento.querySelector('#imposto-de-renda')).not.toBeNull();
    expect(elemento.querySelector('#notas-fiscais')).not.toBeNull();
  });

  it('não utiliza registros de outros grupos para exibir o Pix', () => {
    responder([{ ...pix, grupo: 'produtos' }]);

    expect(elemento.querySelector('#pix')).toBeNull();
  });

  it('permite tentar novamente após uma falha sem ocultar as outras modalidades', () => {
    httpMock.expectOne(endpoint).flush(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
    fixture.detectChanges();

    expect(elemento.querySelector('[role="alert"]')).not.toBeNull();
    expect(elemento.querySelector('#pix')).toBeNull();
    expect(elemento.querySelector('#imposto-de-renda')).not.toBeNull();
    expect(elemento.querySelector('#notas-fiscais')).not.toBeNull();

    elemento.querySelector<HTMLButtonElement>('.botao-tentar-novamente')!.click();
    fixture.detectChanges();

    responder([pix]);

    expect(elemento.querySelector('[role="alert"]')).toBeNull();
    expect(elemento.querySelector('#pix')).not.toBeNull();
  });

  it('mantém a chave disponível quando a imagem não pode ser carregada', () => {
    responder([pix]);

    elemento.querySelector<HTMLImageElement>('.pix-imagem img')!.dispatchEvent(
      new Event('error'),
    );
    fixture.detectChanges();

    expect(elemento.querySelector('.pix-imagem img')).toBeNull();
    expect(elemento.querySelector('.imagem-indisponivel')).not.toBeNull();
    expect(elemento.querySelector('.chave-pix-valor')?.textContent).toContain(
      pix.conteudo,
    );
  });
});
