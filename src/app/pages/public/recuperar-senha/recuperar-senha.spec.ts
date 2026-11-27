import { TestBed } from '@angular/core/testing';
import { ToastrService } from 'ngx-toastr';
import { RecuperacaoSenhaService, RecuperacaoSenhaResposta } from '../../../shared/services/auth/recuperacao-senha.service';
import { RecuperarSenha } from './recuperar-senha';

describe('Recuperação de senha — CAPTCHA', () => {
  async function concluirEnvio() {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  }
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
    localStorage.removeItem('ler_recovery_session');
  });

  function preparar() {
    localStorage.removeItem('ler_recovery_session');
    const service = { solicitarRecuperacao: vi.fn<(...args: string[]) => Promise<void | RecuperacaoSenhaResposta>>(() => Promise.resolve()) };
    const toastr = { success: vi.fn(), warning: vi.fn(), error: vi.fn() };
    TestBed.configureTestingModule({
      imports: [RecuperarSenha], providers: [
        { provide: RecuperacaoSenhaService, useValue: service },
        { provide: ToastrService, useValue: toastr },
      ],
    }).overrideComponent(RecuperarSenha, { set: { template: '', imports: [] } });
    const fixture = TestBed.createComponent(RecuperarSenha);
    fixture.detectChanges();
    const tela = fixture.componentInstance;
    tela.formEmail.controls.email.setValue('pessoa@exemplo.com');
    return { tela, service, fixture, toastr };
  }

  it('não solicita código sem comprovação', () => {
    const { tela, service } = preparar();
    tela.solicitarCodigo();
    expect(service.solicitarRecuperacao).not.toHaveBeenCalled();
    expect(tela.erroEnvio()).toContain('verificação');
  });

  it('envia o token uma vez e inicia o intervalo de 30 segundos', async () => {
    const { tela, service } = preparar();
    tela.captchaToken.set('comprovacao');
    tela.solicitarCodigo();
    tela.solicitarCodigo();
    await Promise.resolve();
    await Promise.resolve();
    expect(service.solicitarRecuperacao).toHaveBeenCalledExactlyOnceWith('pessoa@exemplo.com', 'comprovacao');
    expect(tela.captchaToken()).toBe('');
    expect(tela.step()).toBe(2);
    expect(tela.tempoEspera()).toBe(30);
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
  it('mantém a progressão anterior e o toast de reenvio', async () => {
    const { tela, toastr } = preparar();
    let agora = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => agora);
    for (const penalidade of [30, 60, 90, 180, 600, 1800, 3600, 3600]) {
      tela.captchaToken.set('token-' + agora);
      if (tela.step() === 1) tela.solicitarCodigo();
      else tela.reenviarCodigo();
      await concluirEnvio();
      expect(tela.tempoEspera()).toBe(penalidade);
      agora += penalidade * 1000;
      tela.atualizarContagem();
    }
    expect(toastr.success).toHaveBeenCalledWith('Código reenviado com sucesso.', 'Sucesso');
  });

  it('mantém o perdão de dois minutos após o fim da espera', async () => {
    const { tela } = preparar();
    let agora = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => agora);
    tela.captchaToken.set('primeiro');
    tela.solicitarCodigo();
    await concluirEnvio();
    agora += (30 + 120) * 1000;
    tela.atualizarContagem();
    tela.captchaToken.set('segundo');
    tela.reenviarCodigo();
    await concluirEnvio();
    expect(tela.tempoEspera()).toBe(30);
  });

  it('restaura o toast de limite e preserva o prazo da API sem renovar a penalidade', async () => {
    const { tela, service, toastr } = preparar();
    service.solicitarRecuperacao.mockRejectedValue({ status: 429, error: { retryAfterSeconds: 17 } });
    tela.captchaToken.set('token');
    tela.solicitarCodigo();
    await concluirEnvio();
    expect(toastr.warning).toHaveBeenCalledWith('Aguarde um momento antes de solicitar um novo código.', 'Aviso');
    expect(tela.step()).toBe(2);
    expect(tela.avisoCodigoPendente()).toBe(true);
    expect(tela.tempoEspera()).toBe(17);
    expect(toastr.success).not.toHaveBeenCalled();
  });

  it('mantém o toast original de falha de comunicação', async () => {
    const { tela, service, toastr } = preparar();
    service.solicitarRecuperacao.mockRejectedValue({ status: 0 });
    tela.captchaToken.set('token');
    tela.solicitarCodigo();
    await concluirEnvio();
    expect(toastr.error).toHaveBeenCalledWith('Não foi possível conectar ao servidor. Tente novamente.', 'Erro');
  });

  it('permite corrigir o endereço sem transferir a espera para outra pessoa', async () => {
    const { tela, service } = preparar();
    tela.captchaToken.set('primeiro');
    tela.solicitarCodigo();
    await concluirEnvio();
    tela.voltarParaEmail();
    tela.formEmail.controls.email.setValue('outra@exemplo.com');
    tela.captchaToken.set('segundo');
    tela.solicitarCodigo();
    await concluirEnvio();
    expect(service.solicitarRecuperacao).toHaveBeenCalledTimes(2);
    expect(tela.tempoEspera()).toBe(30);
  });

  it('sincroniza a penalidade devolvida pela API mesmo sem histórico local', async () => {
    const { tela, service } = preparar();
    service.solicitarRecuperacao.mockResolvedValueOnce({ retryAfterSeconds: 1795, tentativas: 5 });
    tela.captchaToken.set('token');
    tela.solicitarCodigo();
    await concluirEnvio();
    expect(tela.tempoEspera()).toBe(1795);
    const storage = JSON.parse(localStorage.getItem('ler_recovery_session')!);
    expect(Object.values(storage.historico)[0]).toMatchObject({ tentativas: 5 });
  });

});
