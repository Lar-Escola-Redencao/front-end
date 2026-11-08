import { TestBed } from '@angular/core/testing';
import { ToastrService } from 'ngx-toastr';
import { RecuperacaoSenhaService } from '../../../shared/services/auth/recuperacao-senha.service';
import { RecuperarSenha } from './recuperar-senha';

describe('Recuperação de senha — CAPTCHA', () => {
  async function concluirEnvio() {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  }
  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.removeItem('ler_recovery_session');
  });

  function preparar() {
    localStorage.removeItem('ler_recovery_session');
    const service = { solicitarRecuperacao: vi.fn<(...args: string[]) => Promise<void>>(() => Promise.resolve()) };
    TestBed.configureTestingModule({
      imports: [RecuperarSenha], providers: [
        { provide: RecuperacaoSenhaService, useValue: service },
        { provide: ToastrService, useValue: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } },
      ],
    }).overrideComponent(RecuperarSenha, { set: { template: '', imports: [] } });
    const fixture = TestBed.createComponent(RecuperarSenha);
    fixture.detectChanges();
    const tela = fixture.componentInstance;
    tela.formEmail.controls.email.setValue('pessoa@exemplo.com');
    return { tela, service, fixture };
  }

  it('não solicita código sem comprovação', () => {
    const { tela, service } = preparar();
    tela.solicitarCodigo();
    expect(service.solicitarRecuperacao).not.toHaveBeenCalled();
    expect(tela.erroEnvio()).toContain('verificação');
  });

  it('envia o token uma vez e inicia o intervalo de 60 segundos', async () => {
    const { tela, service } = preparar();
    tela.captchaToken.set('comprovacao');
    tela.solicitarCodigo();
    tela.solicitarCodigo();
    await Promise.resolve();
    await Promise.resolve();
    expect(service.solicitarRecuperacao).toHaveBeenCalledExactlyOnceWith('pessoa@exemplo.com', 'comprovacao');
    expect(tela.captchaToken()).toBe('');
    expect(tela.step()).toBe(2);
    expect(tela.tempoEspera()).toBe(60);
  });

  it('não avança como sucesso quando o servidor falha e aplica o tempo retornado', async () => {
    const { tela, service } = preparar();
    service.solicitarRecuperacao.mockRejectedValue({ status: 503, error: { message: 'Tente novamente.', retryAfterSeconds: 60 } });
    tela.captchaToken.set('comprovacao');
    tela.solicitarCodigo();
    await concluirEnvio();
    expect(tela.step()).toBe(1);
    expect(tela.erroEnvio()).toBe('Tente novamente.');
    expect(tela.tempoEspera()).toBeGreaterThan(0);
    expect(tela.captchaToken()).toBe('');
  });

  it('permite nova verificação após erro de comunicação', async () => {
    const { tela, service } = preparar();
    service.solicitarRecuperacao.mockRejectedValueOnce({ status: 0 });
    tela.captchaToken.set('comprovacao');
    tela.solicitarCodigo();
    await concluirEnvio();
    expect(tela.loading()).toBe(false);
    expect(tela.step()).toBe(1);
    expect(tela.erroEnvio()).toContain('conectar');
    tela.captchaToken.set('nova-comprovacao');
    tela.solicitarCodigo();
    expect(service.solicitarRecuperacao).toHaveBeenCalledTimes(2);
  });
});
