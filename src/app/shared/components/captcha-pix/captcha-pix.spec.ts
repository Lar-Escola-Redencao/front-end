import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { environment } from 'src/environments/environment';
import { CaptchaPix } from './captcha-pix';

describe('CaptchaPix — ciclo de verificação', () => {
  let fixture: ComponentFixture<CaptchaPix>;
  let opcoes: Record<string, any>;
  const chaveOriginal = environment.turnstileSiteKey;
  const render = vi.fn();
  const remove = vi.fn();
  const reset = vi.fn();
  let tokens: string[];

  beforeEach(async () => {
    tokens = [];
    environment.turnstileSiteKey = 'sitekey-unitaria';
    render.mockImplementation((_container, configuracao) => { opcoes = configuracao; return 'widget'; });
    window.turnstile = { render, remove, reset };
    await TestBed.configureTestingModule({ imports: [CaptchaPix] }).compileComponents();
    fixture = TestBed.createComponent(CaptchaPix);
    fixture.componentRef.setInput('identificador', 'LER123');
    fixture.componentInstance.tokenAlterado.subscribe(token => tokens.push(token));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    delete window.turnstile;
    environment.turnstileSiteKey = chaveOriginal;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('vincula o token à doação e usa largura flexível sem repetir sucesso visualmente', () => {
    expect(opcoes).toMatchObject({ action: 'agradecimento_pix', cData: 'LER123', size: 'flexible' });
    opcoes['callback']('token-real-do-provedor');
    fixture.detectChanges();
    expect(tokens).toEqual(['token-real-do-provedor']);
    expect(fixture.nativeElement.querySelector('p').classList.contains('somente-leitor')).toBe(true);
  });

  it('descarta o token expirado e oferece nova verificação', () => {
    opcoes['callback']('token');
    opcoes['expired-callback']();
    fixture.detectChanges();
    expect(tokens).toEqual(['token', '']);
    expect(fixture.nativeElement.textContent).toContain('expirou');
    fixture.nativeElement.querySelector('button').click();
    expect(reset).toHaveBeenCalledWith('widget');
  });

  it.each(['error-callback', 'timeout-callback'])('preserva uma tentativa controlada após %s', callback => {
    opcoes[callback]();
    fixture.detectChanges();
    expect(tokens.at(-1)).toBe('');
    expect(fixture.nativeElement.querySelector('button').textContent).toContain('Tentar verificação novamente');
    expect(fixture.nativeElement.querySelector('p').classList.contains('somente-leitor')).toBe(false);
  });

  it('usa largura flexível e destaca a solicitação de nova verificação em vermelho', () => {
    expect(opcoes['size']).toBe('flexible');
    fixture.componentInstance.resetar();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p').classList.contains('mensagem-erro')).toBe(true);
    expect(fixture.nativeElement.querySelector('.compacto')).toBeNull();
  });

  it('remove o widget ao sair da etapa', () => {
    fixture.destroy();
    expect(remove).toHaveBeenCalledWith('widget');
  });
});
