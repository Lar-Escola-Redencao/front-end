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
import { Alertas } from 'src/app/shared/utils/alerts';
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
    nomeRecebedor: 'LAR ESCOLA REDENCAO',
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
    elemento
      .querySelector<HTMLFormElement>('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  it('mostra valores sugeridos e recebe somente a chave configurada no servidor', async () => {
    await carregar();
    expect(elemento.querySelectorAll('.valores-sugeridos button')).toHaveLength(4);
    expect(elemento.textContent).toContain(config.chave);
    expect(elemento.querySelector('.qr-code')).toBeNull();
  });

  it('preserva a abertura, a ilustração e as demais seções da página original', async () => {
    await carregar();
    expect(elemento.querySelector('.abertura h1')?.textContent).toContain('Grandes caminhos');
    expect(elemento.querySelector('.abertura-ilustracao img')?.getAttribute('src'))
      .toBe('/images/doacao-solidaria.png');
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
    expect(elemento.querySelector('.chave-pix-feedback')?.textContent).toContain('Chave Pix copiada');
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
    expect(elemento.querySelector('.gerar-pix')?.textContent).toContain('Gerando Pix');
    expect(elemento.querySelector('app-modal-layout')).toBeNull();
    await aguardarGeracao();
    fixture.detectChanges();
    expect(elemento.querySelector('.qr-code')?.getAttribute('src')).toBe(codigo.qrCode);
    expect(elemento.querySelector('.historico')).toBeNull();
    const recuperado = TestBed.runInInjectionContext(() => new HistoricoPixService());
    expect(recuperado.codigos()[0].valor).toBe(42.35);
    const copiar = vi.spyOn(TestBed.inject(Clipboard), 'copy').mockReturnValue(true);
    elemento.querySelector<HTMLButtonElement>('.copiar-pix')!.click();
    expect(copiar).toHaveBeenCalledWith(codigo.copiaECola);
  });

  it('mostra o QR Code no modal e permite declarar a doação sem informar e-mail', async () => {
    await carregar();
    enviar();
    http.expectOne(`${url}/codigo`).flush(codigo);
    await aguardarGeracao();
    fixture.detectChanges();
    expect(elemento.querySelector('.secao-pix .qr-code')).toBeNull();
    expect(elemento.querySelector('app-modal-layout .qr-code')).not.toBeNull();
    expect(elemento.querySelector('.pix-tempo')?.textContent).toMatch(/1[45]:\d{2}/);
    elemento.querySelector<HTMLFormElement>('.pix-form-agradecimento')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(elemento.querySelector('.pix-agradecimento')?.textContent).toContain('Obrigado');
    expect(TestBed.inject(HistoricoPixService).codigos()[0].contribuicaoInformada).toBe(true);
    expect(elemento.querySelector('.historico')?.textContent).toContain('Seus Pix');
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
    elemento.querySelector<HTMLButtonElement>('.pix-retomar')!.click();
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
    await fixture.whenStable();
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

  it('abre a explicação de Seus Pix mesmo com a lista recolhida', async () => {
    await carregar();
    TestBed.inject(HistoricoPixService).salvar({ ...codigo, contribuicaoInformada: true });
    fixture.detectChanges();
    expect(elemento.querySelector('details.historico')?.hasAttribute('open')).toBe(false);
    elemento.querySelector<HTMLButtonElement>('.historico-duvida')!.click();
    fixture.detectChanges();
    expect(document.querySelector('.historico-explicacao')?.textContent).toContain('somente neste navegador');
    document.querySelector<HTMLButtonElement>('[aria-label="Fechar explicação"]')!.click();
    fixture.detectChanges();
    expect(document.querySelector('.historico-explicacao')).toBeNull();
  });

  it('cancela o Pix em aberto e permite gerar outro preservando as doações informadas', async () => {
    await carregar();
    const confirmar = vi.spyOn(Alertas, 'confirmarCancelamentoPix').mockResolvedValue(true);
    const historico = TestBed.inject(HistoricoPixService);
    historico.salvar({ ...codigo, identificador: 'DOACAOINFORMADA', contribuicaoInformada: true });
    enviar();
    http.expectOne(`${url}/codigo`).flush(codigo);
    await aguardarGeracao();
    fixture.detectChanges();
    elemento.querySelector<HTMLButtonElement>('app-modal-layout .pix-cancelar')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(confirmar).toHaveBeenCalledOnce();
    expect(elemento.querySelector('app-modal-layout')).toBeNull();
    expect(elemento.querySelector('.pix-imagem .qr-code')).toBeNull();
    expect(historico.codigos().map((item) => item.identificador)).toEqual(['DOACAOINFORMADA']);
    await digitar('50,00');
    enviar();
    http.expectOne(`${url}/codigo`).flush({ ...codigo, identificador: 'NOVOPIX', valor: 50 });
    await aguardarGeracao();
    fixture.detectChanges();
    expect(historico.codigos().map((item) => item.identificador)).toEqual(['NOVOPIX', 'DOACAOINFORMADA']);
  });

  it('preserva o Pix e o modal quando o usuário desiste do cancelamento', async () => {
    await carregar();
    vi.spyOn(Alertas, 'confirmarCancelamentoPix').mockResolvedValue(false);
    enviar();
    http.expectOne(`${url}/codigo`).flush(codigo);
    await aguardarGeracao();
    fixture.detectChanges();
    elemento.querySelector<HTMLButtonElement>('app-modal-layout .pix-cancelar')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(elemento.querySelector('app-modal-layout .qr-code')).not.toBeNull();
    expect(TestBed.inject(HistoricoPixService).codigos()).toHaveLength(1);
  });

  it('exclui um registro de Seus Pix somente após confirmar o alerta padrão', async () => {
    await carregar();
    const historico = TestBed.inject(HistoricoPixService);
    const confirmar = vi.spyOn(Alertas, 'confirmarExclusao').mockResolvedValue(false);
    historico.salvar({ ...codigo, contribuicaoInformada: true });
    fixture.detectChanges();
    elemento.querySelector<HTMLButtonElement>('.remover-codigo')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(historico.codigos()).toHaveLength(1);
    confirmar.mockResolvedValue(true);
    elemento.querySelector<HTMLButtonElement>('.remover-codigo')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(historico.codigos()).toHaveLength(0);
    expect(elemento.querySelector('.historico')).toBeNull();
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
    expect(elemento.querySelector('.pix-prazo-encerrado')?.textContent).toContain('Gerar novo Pix');
  });

  it('recusa valor zero ou mais de duas casas sem chamar o back-end', async () => {
    await carregar();
    for (const valor of ['0', '1,001', '-5', '1000000']) {
      await digitar(valor);
      enviar();
      fixture.detectChanges();
      expect(elemento.querySelector('#erro-valor')).not.toBeNull();
      http.expectNone(`${url}/codigo`);
    }
  });

  it('remove o código anterior da tela quando o valor é alterado', async () => {
    await carregar();
    enviar();
    http.expectOne(`${url}/codigo`).flush(codigo);
    await aguardarGeracao();
    fixture.detectChanges();
    await digitar('50,00');
    expect(elemento.querySelector('.qr-code')).toBeNull();
    expect(TestBed.inject(HistoricoPixService).codigos()).toHaveLength(1);
  });

  it('não oferece geração quando o Pix está inativo', () => {
    http.expectOne(url).flush({}, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(elemento.querySelector('form')).toBeNull();
    expect(elemento.textContent).toContain('indisponíveis');
  });

  it('permite tentar novamente após falha de rede', async () => {
    http.expectOne(url).error(new ProgressEvent('error'));
    fixture.detectChanges();
    elemento.querySelector<HTMLButtonElement>('.estado-erro button')!.click();
    await carregar();
    expect(elemento.querySelector('form')).not.toBeNull();
  });
});
