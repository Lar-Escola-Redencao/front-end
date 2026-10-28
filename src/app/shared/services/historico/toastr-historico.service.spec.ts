import { TestBed } from '@angular/core/testing';
import { ActiveToast, ToastrService, provideToastr } from 'ngx-toastr';
import { vi } from 'vitest';
import { HistoricoAtualizacoesService } from './historico-atualizacoes.service';
import { ToastrHistoricoService } from './toastr-historico.service';

describe('Atualização do histórico pelos avisos de sucesso', () => {
  afterEach(() => vi.restoreAllMocks());

  it('preserva o aviso existente e emite a atualização ao mostrar sucesso', () => {
    TestBed.configureTestingModule({ providers: [
      provideToastr(), { provide: ToastrService, useClass: ToastrHistoricoService }
    ] });
    const aviso = { toastId: 1 } as ActiveToast<unknown>;
    const sucesso = vi.spyOn(ToastrService.prototype, 'success').mockReturnValue(aviso);
    const atualizar = vi.fn();
    const assinatura = TestBed.inject(HistoricoAtualizacoesService).sucesso.subscribe(atualizar);

    const resultado = TestBed.inject(ToastrService).success('Registro salvo.', 'Sucesso');

    expect(resultado).toBe(aviso);
    expect(sucesso).toHaveBeenCalledWith('Registro salvo.', 'Sucesso', undefined);
    expect(atualizar).toHaveBeenCalledTimes(1);
    assinatura.unsubscribe();
  });

  it('não emite atualização para erro ou aviso', () => {
    TestBed.configureTestingModule({ providers: [
      provideToastr(), { provide: ToastrService, useClass: ToastrHistoricoService }
    ] });
    vi.spyOn(ToastrService.prototype, 'error').mockReturnValue({} as ActiveToast<unknown>);
    vi.spyOn(ToastrService.prototype, 'warning').mockReturnValue({} as ActiveToast<unknown>);
    const atualizar = vi.fn();
    const assinatura = TestBed.inject(HistoricoAtualizacoesService).sucesso.subscribe(atualizar);
    const servico = TestBed.inject(ToastrService);

    servico.error('Falha ao salvar.');
    servico.warning('Confira os dados.');

    expect(atualizar).not.toHaveBeenCalled();
    assinatura.unsubscribe();
  });
});
