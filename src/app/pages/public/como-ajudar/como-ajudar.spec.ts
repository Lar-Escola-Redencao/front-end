import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { Clipboard } from '@angular/cdk/clipboard';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { PublicFooter } from '@components/public-footer/public-footer';
import { environment } from 'src/environments/environment';
import { CodigoPix, ConfiguracaoPix } from 'src/app/shared/services/pix/pix.service';
import { HistoricoPixService } from 'src/app/shared/services/pix/historico-pix.service';
import { ComoAjudar } from './como-ajudar';

registerLocaleData(localePt);

@Component({ selector: 'app-public-navbar', template: '' })
class NavbarStub {}
@Component({ selector: 'app-public-footer', template: '' })
class FooterStub {}

describe('ComoAjudar — geração local de Pix', () => {
  let fixture: ComponentFixture<ComoAjudar>;
  let http: HttpTestingController;
  let elemento: HTMLElement;
  const url = `${environment.apiUrl}/pix`;
  const config: ConfiguracaoPix = {
    chave: 'pix-demo@example.org',
    nomeRecebedor: 'Instituto Esperança',
    cidadeRecebedor: 'ARARAQUARA',
    valoresSugeridos: [10, 25, 50, 100],
  };
  const codigo: CodigoPix = {
    ...config,
    identificador: 'LER123',
    valor: 25,
    geradoEm: new Date().toISOString(),
    expiraEm: new Date(Date.now() + 15 * 60_000).toISOString(),
    copiaECola: '000201' + '1'.repeat(100),
    qrCode: 'data:image/png;base64,iVBORw0KGgo=',
  };

  beforeEach(async () => {
    localStorage.removeItem('ler.pix.codigos.v1');
    await TestBed.configureTestingModule({
      imports: [ComoAjudar],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    })
      .overrideComponent(ComoAjudar, {
        remove: { imports: [PublicNavbar, PublicFooter] },
        add: { imports: [NavbarStub, FooterStub] },
      })
      .compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ComoAjudar);
    elemento = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('ler.pix.codigos.v1');
    vi.restoreAllMocks();
  });

  async function carregar() {
    http.expectOne(url).flush(config);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function digitar(valor: string) {
    const input = elemento.querySelector<HTMLInputElement>('#valor-doacao')!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function aguardarGeracao() {
    await new Promise((resolve) => setTimeout(resolve, 520));
    fixture.detectChanges();
  }

  function enviar() {
    if (!elemento.querySelector<HTMLInputElement>('#valor-doacao')!.value) {
      elemento.querySelectorAll<HTMLButtonElement>('.valores-sugeridos button')[1].click();
    }
    elemento
      .querySelector<HTMLFormElement>('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  it('mostra o prefixo monetário apenas com foco ou valor preenchido', async () => {
    await carregar();
    const input = elemento.querySelector<HTMLInputElement>('#valor-doacao')!;
    expect(input.value).toBe('');
    expect(elemento.querySelector('.prefixo-moeda')).toBeNull();
    input.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    expect(elemento.querySelector('.prefixo-moeda')?.textContent).toBe('R$');
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(elemento.querySelector('.prefixo-moeda')).toBeNull();
    elemento.querySelector<HTMLButtonElement>('.valores-sugeridos button')!.click();
    fixture.detectChanges();
    expect(elemento.querySelector('.prefixo-moeda')).not.toBeNull();
  });

  it('abre e-mail pela ação de pagamento e fecha ao clicar fora após voltar ao QR Code', async () => {
    await carregar();
    enviar();
    http.expectOne(`${url}/codigo`).flush(codigo);
    await aguardarGeracao();
    expect(elemento.querySelector('#email-agradecimento')).toBeNull();
    elemento.querySelector<HTMLButtonElement>('app-modal-layout .pix-informar')!.click();
    fixture.detectChanges();
    expect(elemento.querySelector('#email-agradecimento')).not.toBeNull();
    expect(elemento.querySelector('app-modal-layout .qr-code')).toBeNull();
    expect(elemento.querySelector('.pix-imagem .qr-code')).not.toBeNull();
    expect(TestBed.inject(HistoricoPixService).codigos()[0].contribuicaoInformada).not.toBe(true);
    elemento.querySelector<HTMLButtonElement>('.pix-voltar')!.click();
    fixture.detectChanges();
    expect(elemento.querySelector('app-modal-layout .qr-code')?.getAttribute('src')).toBe(codigo.qrCode);
    elemento.querySelector<HTMLElement>('.modal-backdrop')!.click();
    fixture.detectChanges();
    expect(elemento.querySelector('app-modal-layout')).toBeNull();
    expect(elemento.querySelector('.pix-imagem .qr-code')).not.toBeNull();
    http.expectNone(`${url}/codigo`);
  });

  it('mostra valores sugeridos e recebe somente a chave configurada no servidor', async () => {
    await carregar();
    expect(elemento.querySelectorAll('.valores-sugeridos button')).toHaveLength(4);
    expect(elemento.textContent).toContain(config.chave);
    expect(elemento.querySelector('.qr-code')).toBeNull();
  });

  it('oculta o recebedor na página e no modal quando não está cadastrado', async () => {
    http.expectOne(url).flush({ ...config, nomeRecebedor: null });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(elemento.querySelector('.pix-recebedor')).toBeNull();
    enviar();
    http.expectOne(`${url}/codigo`).flush({ ...codigo, nomeRecebedor: null });
    await aguardarGeracao();
    expect(elemento.querySelector('app-modal-layout .resultado-cabecalho span')).toBeNull();
    expect(elemento.querySelector('app-modal-layout .qr-code')).not.toBeNull();
  });

  it('preserva a abertura, a ilustração e as demais seções da página original', async () => {
    await carregar();
    expect(elemento.querySelector('.abertura h1')?.textContent).toContain('Grandes caminhos');
    const imagem = elemento.querySelector('.abertura-ilustracao img')!;
    const ilustracaoInicial = imagem.getAttribute('src');
    expect(['/images/criancas-brincando.svg', '/images/doacao-solidaria.png', '/images/estudando.png'])
      .toContain(ilustracaoInicial);
    elemento.querySelector<HTMLButtonElement>('.valores-sugeridos button')!.click();
    fixture.detectChanges();
    expect(imagem.getAttribute('src')).toBe(ilustracaoInicial);
    expect(elemento.querySelector('.abertura-botao')?.getAttribute('href')).toBe('/como-ajudar#pix');
    expect(elemento.querySelector('.secao-pix .pix-informacoes form')).not.toBeNull();
    expect(elemento.querySelector('.secao-pix .pix-imagem .chave-pix')).not.toBeNull();
    expect(elemento.querySelector('#imposto-de-renda.secao-doacao')).not.toBeNull();
    expect(elemento.querySelector('#notas-fiscais.secao-doacao')).not.toBeNull();
    expect(elemento.querySelector('.mensagem-final')).not.toBeNull();
  });

  it('mantém a cópia da chave Pix disponível antes de gerar o QR Code', async () => {
    await carregar();
    const copiar = vi.spyOn(TestBed.inject(Clipboard), 'copy').mockReturnValue(true);
    elemento.querySelector<HTMLButtonElement>('.chave-pix-copiar')!.click();
    fixture.detectChanges();
    expect(copiar).toHaveBeenCalledWith(config.chave);
    const botao = elemento.querySelector<HTMLButtonElement>('.chave-pix-copiar')!;
    expect(botao.textContent).toContain('Chave Pix copiada!');
    expect(botao.querySelector('.material-symbols-outlined')?.textContent).toContain('check');
    expect(botao.disabled).toBe(true);
    expect(elemento.querySelector('.chave-pix-feedback')).toBeNull();
    botao.click();
    expect(copiar).toHaveBeenCalledTimes(1);
    http.expectNone(`${url}/codigo`);
  });

  it('gera um valor livre e guarda o código para reabrir no mesmo navegador', async () => {
    await carregar();
    await digitar('42,35');
    enviar();
    const requisicao = http.expectOne(`${url}/codigo`);
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ valor: 42.35 });
    requisicao.flush({ ...codigo, valor: 42.35 });
    fixture.detectChanges();
    expect(elemento.querySelector('.gerar-pix')?.textContent).toContain('Gerando QR Code');
    expect(elemento.querySelector('app-modal-layout')).toBeNull();
    await aguardarGeracao();
    fixture.detectChanges();
    expect(elemento.querySelector('.qr-code')?.getAttribute('src')).toBe(codigo.qrCode);
    expect(elemento.querySelector('app-modal-layout .resultado-cabecalho')?.textContent).toContain(codigo.nomeRecebedor);
    expect(elemento.querySelector('.historico')).toBeNull();
    const recuperado = TestBed.runInInjectionContext(() => new HistoricoPixService());
    expect(recuperado.codigos()[0].valor).toBe(42.35);
    const copiar = vi.spyOn(TestBed.inject(Clipboard), 'copy').mockReturnValue(true);
    elemento.querySelector<HTMLButtonElement>('.copiar-pix')!.click();
    expect(copiar).toHaveBeenCalledWith(codigo.copiaECola);
  });

  it('mostra o mesmo QR Code no modal e na página e permite declarar a doação sem informar e-mail', async () => {
    await carregar();
    enviar();
    http.expectOne(`${url}/codigo`).flush(codigo);
    await aguardarGeracao();
    fixture.detectChanges();
    expect(elemento.querySelector('.secao-pix .qr-code')?.getAttribute('src')).toBe(codigo.qrCode);
    expect(elemento.querySelector('app-modal-layout .qr-code')).not.toBeNull();
    expect(elemento.querySelector('.pix-tempo')?.textContent).toMatch(/1[45]:\d{2}/);
    elemento.querySelector<HTMLButtonElement>('app-modal-layout .pix-informar')!.click();
    fixture.detectChanges();
    elemento.querySelector<HTMLButtonElement>('.pix-sem-email')!.click();
    fixture.detectChanges();
    expect(elemento.querySelector('.pix-agradecimento')?.textContent).toContain('Agradecemos por sua doação!');
    expect(elemento.querySelector('app-modal-layout .modal-header h2')).toBeNull();
    expect(elemento.querySelector('.pix-agradecimento-icone')).not.toBeNull();
    expect(TestBed.inject(HistoricoPixService).codigos()[0].contribuicaoInformada).toBe(true);
    expect(elemento.querySelector('.historico')).toBeNull();
    expect(elemento.querySelector('.pix-comprovante')?.textContent).toContain('Guarde o comprovante emitido pelo seu banco');
    expect(elemento.querySelector('.pix-comprovante')?.textContent).toContain('o site não confirma o pagamento automaticamente');
    http.expectNone(`${url}/codigo/${codigo.identificador}/agradecimento`);
  });

  it('mantém o Pix em aberto no cartão lateral ao fechar o modal, sem mostrá-lo em Seus Pix', async () => {
    await carregar();
    enviar();
    http.expectOne(`${url}/codigo`).flush(codigo);
    await aguardarGeracao();
    fixture.detectChanges();
    elemento.querySelector<HTMLButtonElement>('app-modal-layout .modal-close')!.click();
    fixture.detectChanges();
    expect(elemento.querySelector('app-modal-layout')).toBeNull();
    expect(elemento.querySelector('.pix-imagem .qr-code')?.getAttribute('src')).toBe(codigo.qrCode);
    expect(elemento.querySelector('.historico')).toBeNull();
    elemento.querySelector<HTMLButtonElement>('.pix-imagem .pix-informar')!.click();
    fixture.detectChanges();
    expect(elemento.querySelector('#email-agradecimento')).not.toBeNull();
    elemento.querySelector<HTMLButtonElement>('.pix-voltar')!.click();
    fixture.detectChanges();
    expect(elemento.querySelector('app-modal-layout .qr-code')).not.toBeNull();
    http.expectNone(`${url}/codigo`);
  });

  it('encaminha o e-mail opcional ao confirmar e só agradece após o servidor responder', async () => {
    await carregar();
    enviar();
    http.expectOne(`${url}/codigo`).flush(codigo);
    await aguardarGeracao();
    fixture.detectChanges();
    elemento.querySelector<HTMLButtonElement>('app-modal-layout .pix-informar')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(elemento.querySelector('app-modal-layout .modal-header h2')?.textContent).toContain('Receber agradecimento');
    expect(elemento.querySelector('.pix-form-agradecimento button[type=submit]')?.textContent).toContain('Receber por e-mail');
    expect(elemento.querySelector('.pix-voltar')?.textContent).toContain('Voltar');
    const email = elemento.querySelector<HTMLInputElement>('#email-agradecimento')!;
    email.value = 'doador@example.org';
    email.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    elemento.querySelector<HTMLFormElement>('.pix-form-agradecimento')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const requisicao = http.expectOne(`${url}/codigo/${codigo.identificador}/agradecimento`);
    expect(requisicao.request.body).toEqual({ email: 'doador@example.org' });
    expect(elemento.querySelector('.pix-agradecimento')).toBeNull();
    requisicao.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();
    expect(elemento.querySelector('.pix-agradecimento')).not.toBeNull();
  });

  it('simplifica as ações e confirma a cópia no próprio botão, sem mensagem adicional', async () => {
    await carregar();
    enviar();
    http.expectOne(`${url}/codigo`).flush(codigo);
    await aguardarGeracao();
    const copiar = vi.spyOn(TestBed.inject(Clipboard), 'copy').mockReturnValue(true);
    const botao = elemento.querySelector<HTMLButtonElement>('app-modal-layout .copiar-pix')!;
    expect(botao.textContent).toContain('Copiar Pix Copia e Cola');
    botao.click();
    fixture.detectChanges();
    expect(copiar).toHaveBeenCalledWith(codigo.copiaECola);
    expect(botao.textContent).toContain('Pix copiado!');
    expect(botao.querySelector('.material-symbols-outlined')?.textContent).toContain('check');
    const botaoPagina = elemento.querySelector<HTMLButtonElement>('.pix-imagem .copiar-pix')!;
    expect(botaoPagina.textContent).toContain('Pix copiado!');
    expect(botao.disabled).toBe(true);
    expect(botaoPagina.disabled).toBe(true);
    botao.click();
    botaoPagina.click();
    expect(copiar).toHaveBeenCalledTimes(1);
    expect(elemento.querySelector('#pix-copia-cola-pagina')).toBeNull();
    elemento.querySelector<HTMLButtonElement>('.pix-imagem .expandir-codigo-pix')!.click();
    fixture.detectChanges();
    expect(elemento.querySelector('#pix-copia-cola-pagina')?.textContent).toBe(codigo.copiaECola);
    expect(elemento.querySelector('app-modal-layout .feedback')).toBeNull();
    expect(elemento.querySelector('.pix-cancelar')).toBeNull();
    expect(elemento.textContent).not.toContain('Baixar QR Code');
    expect(elemento.textContent).not.toContain('Baixar dados do Pix');
    expect(elemento.querySelector('.pix-recebedor')?.textContent).toContain(config.nomeRecebedor);
  });

  it('expande o código sem copiar e mantém as duas ações independentes', async () => {
    await carregar();
    enviar();
    http.expectOne(`${url}/codigo`).flush(codigo);
    await aguardarGeracao();
    const copiar = vi.spyOn(TestBed.inject(Clipboard), 'copy').mockReturnValue(true);
    const seta = elemento.querySelector<HTMLButtonElement>('app-modal-layout .expandir-codigo-pix')!;
    expect(elemento.querySelector('#pix-copia-cola')).toBeNull();
    expect(seta.getAttribute('aria-expanded')).toBe('false');
    seta.click();
    fixture.detectChanges();
    expect(elemento.querySelector('#pix-copia-cola')?.textContent).toBe(codigo.copiaECola);
    expect(seta.getAttribute('aria-expanded')).toBe('true');
    expect(copiar).not.toHaveBeenCalled();
    expect(elemento.querySelector('#pix-copia-cola-pagina')).toBeNull();
    seta.click();
    fixture.detectChanges();
    expect(elemento.querySelector('#pix-copia-cola')).toBeNull();
    expect(elemento.querySelector('.orientacao-valor')?.textContent).toContain('Você pode escolher outro valor');
    expect(elemento.querySelector('.orientacao-valor')?.textContent).toContain('O pagamento só acontece');
    expect(elemento.querySelector('app-modal-layout .nota-prazo')?.textContent).toContain('Você pode escolher outro valor');
  });

  it('informa falha de cópia sem mostrar confirmação de sucesso', async () => {
    await carregar();
    enviar();
    http.expectOne(`${url}/codigo`).flush(codigo);
    await aguardarGeracao();
    vi.spyOn(TestBed.inject(Clipboard), 'copy').mockReturnValue(false);
    elemento.querySelector<HTMLButtonElement>('app-modal-layout .copiar-pix')!.click();
    fixture.detectChanges();
    expect(elemento.querySelector('app-modal-layout .copiar-pix')?.textContent).toContain('Copiar Pix Copia e Cola');
    expect(elemento.querySelector('app-modal-layout .feedback')?.textContent).toContain('Não foi possível copiar');
  });

  it('substitui o código pendente ao gerar outro valor sem acumular códigos em aberto', async () => {
    await carregar();
    const historico = TestBed.inject(HistoricoPixService);
    historico.salvar(codigo);
    await digitar('50,00');
    enviar();
    http.expectOne(`${url}/codigo`).flush({ ...codigo, identificador: 'OUTROVALOR', valor: 50 });
    await aguardarGeracao();
    fixture.detectChanges();
    expect(historico.codigos()).toHaveLength(1);
    expect(historico.codigos()[0].identificador).toBe('OUTROVALOR');
  });

  it('oculta um código com prazo encerrado e oferece gerar outro', async () => {
    await carregar();
    enviar();
    http.expectOne(`${url}/codigo`).flush({
      ...codigo, geradoEm: new Date(Date.now() - 16 * 60_000).toISOString(),
      expiraEm: new Date(Date.now() - 60_000).toISOString(),
    });
    await aguardarGeracao();
    fixture.detectChanges();
    expect(elemento.querySelector('app-modal-layout .qr-code')).toBeNull();
    expect(elemento.querySelector('app-modal-layout .copiar-pix')).toBeNull();
    expect(elemento.querySelector('.pix-prazo-encerrado')?.textContent).toContain('Gerar novo QR Code');
  });

  it('limita a digitação a seis inteiros e duas casas, inclusive ao colar', async () => {
    await carregar();
    await digitar('999999,99');
    for (const valor of ['1000000', '999999,999', '-5', 'abc', '1,2,3']) {
      await digitar(valor);
      expect(elemento.querySelector<HTMLInputElement>('#valor-doacao')!.value).toBe('999999,99');
    }
    enviar();
    const requisicao = http.expectOne(`${url}/codigo`);
    expect(requisicao.request.body).toEqual({ valor: 999999.99 });
    requisicao.flush(codigo);
    await aguardarGeracao();
  });

  it('recusa valor zero sem chamar o back-end', async () => {
    await carregar();
    await digitar('0');
    enviar();
    fixture.detectChanges();
    expect(elemento.querySelector('#erro-valor')).not.toBeNull();
    http.expectNone(`${url}/codigo`);
  });

  it('preserva o Pix gerado na página enquanto outro valor é escolhido', async () => {
    await carregar();
    enviar();
    http.expectOne(`${url}/codigo`).flush(codigo);
    await aguardarGeracao();
    fixture.detectChanges();
    await digitar('50,00');
    expect(elemento.querySelector('.pix-imagem .qr-code')?.getAttribute('src')).toBe(codigo.qrCode);
    expect(TestBed.inject(HistoricoPixService).codigos()).toHaveLength(1);
  });

  it('não oferece geração quando o Pix está inativo', () => {
    http.expectOne(url).flush({}, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(elemento.querySelector('form')).toBeNull();
    expect(elemento.textContent).toContain('indisponíveis');
  });

  it('mostra uma mensagem amigável de geração sem expor erros internos do servidor', async () => {
    await carregar();
    enviar();
    http.expectOne(`${url}/codigo`).flush({
      message: 'Unresolved compilation problems: BitMatrix cannot be resolved to a type',
    }, { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();
    expect(elemento.textContent).toContain('Não foi possível gerar o QR Code. Tente novamente em instantes.');
    expect(elemento.textContent).not.toContain('BitMatrix');
    expect(elemento.textContent).not.toContain('Unresolved compilation');
    expect(elemento.querySelector<HTMLButtonElement>('.gerar-pix')?.disabled).toBe(false);
  });

  it('permite tentar novamente após falha de rede', async () => {
    http.expectOne(url).error(new ProgressEvent('error'));
    fixture.detectChanges();
    elemento.querySelector<HTMLButtonElement>('.estado-erro button')!.click();
    await carregar();
    expect(elemento.querySelector('form')).not.toBeNull();
  });
});
