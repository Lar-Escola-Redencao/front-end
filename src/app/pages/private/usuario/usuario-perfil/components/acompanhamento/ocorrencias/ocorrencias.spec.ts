import { TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ToastrService } from 'ngx-toastr';
import { AcompanhamentoOcorrencias } from './ocorrencias';
import { AcompanhamentoService } from 'src/app/shared/services/acompanhamento/acompanhamento.service';
import { DiarioService } from 'src/app/shared/services/diario/diario.service';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';
import { MatriculaHistoricoDTO, UsuarioResponseDTO } from 'src/app/shared/models/usuario.model';

describe('Cadastro de ocorrências no perfil', () => {
  let perfil: string;
  const matricula: MatriculaHistoricoDTO = { id: 10, idUnidade: 1, nomeUnidade: 'Sede', idTurma: 2,
    periodoTurma: 'MANHA', horaInicio: '08:00:00', horaFim: '12:00:00', status: 'ATIVO',
    dataIngresso: '2020-01-01T00:00:00' };
  const registro = { id: 3, idMatricula: 10, idMembro: 7, nomeMembro: 'Autor original',
    dataOcorrencia: '2026-11-02T07:00:00', dataCriacao: '2026-11-02T07:00:00',
    tipoOcorrencia: 'OUTRO' as const, descricao: 'Relato', turmaUnidade: 'Sede - Manhã' };
  let api: { criarOcorrencia: ReturnType<typeof vi.fn>; atualizarOcorrencia: ReturnType<typeof vi.fn>; deletarOcorrencia: ReturnType<typeof vi.fn> };
  let matriculas: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    perfil = 'MONITOR';
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-02T07:00:30-03:00'));
    api = { criarOcorrencia: vi.fn(() => of(registro)), atualizarOcorrencia: vi.fn(() => of(registro)), deletarOcorrencia: vi.fn() };
    matriculas = vi.fn(() => of([matricula]));
    TestBed.configureTestingModule({ providers: [
      { provide: DiarioService, useValue: api },
      { provide: AcompanhamentoService, useValue: { matriculasFrequencia: matriculas,
        ocorrencias: vi.fn(() => of({ content: [], page: { number: 0, size: 5, totalPages: 0, totalElements: 0 } })) } },
      { provide: SessaoService, useValue: { isMonitor: () => perfil === 'MONITOR',
        isAdministrador: () => perfil === 'ADMINISTRADOR', isCoordenador: () => perfil === 'COORDENADOR',
        membro: () => ({ id: 7, nomeCompleto: 'Colaborador logado' }) } },
      { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn() } },
    ] });
  });
  afterEach(() => vi.restoreAllMocks());

  function abrir() {
    const fixture = TestBed.createComponent(AcompanhamentoOcorrencias);
    fixture.componentRef.setInput('usuario', { id: 1, nomeCompleto: 'Usuário' } as UsuarioResponseDTO);
    fixture.detectChanges(); fixture.componentInstance.abrir('NOVO'); fixture.detectChanges();
    fixture.componentInstance.form.patchValue({ data: '2026-11-02', horario: '07:00', tipoOcorrencia: 'OUTRO', descricao: ' Relato ' });
    return fixture;
  }

  it('registra antes do início da turma e usa a matrícula selecionada', () => {
    const fixture = abrir();
    fixture.componentInstance.salvar();
    expect(api.criarOcorrencia).toHaveBeenCalledWith({ idMatricula: 10,
      dataOcorrencia: '2026-11-02T07:00:00', tipoOcorrencia: 'OUTRO', descricao: 'Relato' });
    expect(fixture.componentInstance.modal()).toBeNull();
  });

  it('limita o cadastro do monitor ao primeiro dia do mês anterior, inclusivo', () => {
    const c = abrir().componentInstance;
    c.form.controls.data.setValue('2026-09-30'); c.salvar();
    expect(api.criarOcorrencia).not.toHaveBeenCalled(); expect(c.form.controls.data.getError('regra')).toContain('mês anterior');
    c.form.controls.data.setValue('2026-10-01'); c.salvar();
    expect(api.criarOcorrencia).toHaveBeenCalledOnce();
  });

  for (const papel of ['MONITOR', 'COORDENADOR', 'ADMINISTRADOR']) {
    it(`recusa data e horário futuros para ${papel}`, () => {
      perfil = papel; const c = abrir().componentInstance;
      c.form.controls.horario.setValue('07:01'); c.salvar();
      expect(api.criarOcorrencia).not.toHaveBeenCalled(); expect(c.form.controls.horario.getError('regra')).toContain('futuro');
      c.form.patchValue({ data: '2026-11-03', horario: '06:00' }); c.salvar();
      expect(api.criarOcorrencia).not.toHaveBeenCalled();
    });
  }

  for (const papel of ['COORDENADOR', 'ADMINISTRADOR']) {
    it(`permite cadastro antigo e edição de outro autor por ${papel}, preservando o responsável original`, () => {
      perfil = papel; const fixture = abrir(); const c = fixture.componentInstance;
      c.form.controls.data.setValue('2021-01-01'); c.salvar();
      expect(api.criarOcorrencia).toHaveBeenCalledOnce();
      c.abrir('EDITAR', { ...registro, idMembro: 99, dataCriacao: '2021-01-01T07:00:00' }); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.subtitulos-modal').textContent).toContain('Registrado por Autor original');
      c.form.controls.descricao.setValue('Corrigido'); c.salvar();
      expect(api.atualizarOcorrencia).toHaveBeenCalledWith(3, { dataOcorrencia: registro.dataOcorrencia,
        tipoOcorrencia: 'OUTRO', descricao: 'Corrigido' });
    });
  }

  it('exige escolha quando há duas matrículas e recusa data fora da matrícula escolhida', () => {
    matriculas.mockReturnValue(of([matricula, { ...matricula, id: 20, periodoTurma: 'TARDE', dataIngresso: '2026-11-01T00:00:00' }]));
    const c = abrir().componentInstance; c.salvar(); expect(api.criarOcorrencia).not.toHaveBeenCalled();
    expect(c.form.get('matricula')).not.toBeNull();
    (c.form as FormGroup).get('matricula')?.setValue(20); c.form.controls.data.setValue('2026-10-31'); c.salvar();
    expect(api.criarOcorrencia).not.toHaveBeenCalled(); expect(c.form.controls.data.getError('regra')).toContain('matrícula');
  });

  it('falha ao carregar matrículas impede envio e permite tentar novamente', () => {
    matriculas.mockReturnValue(throwError(() => new Error('Falha')));
    const fixture = abrir(); fixture.componentInstance.salvar(); fixture.detectChanges();
    expect(api.criarOcorrencia).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar as matrículas');
    expect(fixture.nativeElement.textContent).toContain('Tentar novamente');
  });

  it('falha ao cadastrar mantém formulário, matrícula e dados preenchidos', () => {
    api.criarOcorrencia.mockReturnValue(throwError(() => ({ error: { message: 'Falha de envio' } })));
    const c = abrir().componentInstance; c.salvar();
    expect(c.modal()).toBe('NOVO'); expect(c.form.controls.descricao.value).toBe(' Relato ');
    expect(c.form.get('matricula')?.value).toBe(10); expect(c.erro()).toBe('Falha de envio');
    expect(c.form.enabled).toBe(true);
  });

  it('monitor não abre edição alheia e não envia alteração após vencerem as 24 horas', () => {
    const c = abrir().componentInstance; c.cancelar();
    c.abrir('EDITAR', { ...registro, idMembro: 99 }); expect(c.modal()).toBeNull();
    c.abrir('EDITAR', registro); c.form.controls.descricao.setValue('Corrigido');
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-03T07:00:01-03:00'));
    c.salvar(); expect(api.atualizarOcorrencia).not.toHaveBeenCalled();
    expect(c.erro()).toContain('prazo');
  });

  it('mostra horário futuro no campo de horário e limpa o erro quando a data passa para ontem', () => {
    const fixture = abrir(); const c = fixture.componentInstance;
    c.form.controls.horario.setValue('07:01'); c.salvar(); fixture.detectChanges();
    const campo = fixture.nativeElement.querySelector('input[formControlName="horario"]').closest('.campo-com-erro');
    expect(campo.querySelector('mat-form-field').classList.contains('mat-form-field-invalid')).toBe(true);
    expect(campo.querySelector('.error-text')?.textContent).toContain('futuro');
    expect(fixture.nativeElement.querySelector('.formulario > .erro')).toBeNull();
    c.form.controls.data.setValue('2026-11-01'); fixture.detectChanges();
    expect(c.form.controls.horario.invalid).toBe(false);
    expect(campo.querySelector('.error-text')).toBeNull();
  });

  it('mostra data futura somente abaixo da data', () => {
    const fixture = abrir(); const c = fixture.componentInstance;
    c.form.controls.data.setValue('2026-11-03'); c.salvar(); fixture.detectChanges();
    const campo = fixture.nativeElement.querySelector('input[formControlName="data"]').closest('.campo-com-erro');
    expect(campo.querySelector('mat-form-field').classList.contains('mat-form-field-invalid')).toBe(true);
    expect(campo.querySelector('.error-text')?.textContent).toContain('futuro');
    expect(c.form.controls.horario.invalid).toBe(false);
    expect(fixture.nativeElement.querySelector('.formulario > .erro')).toBeNull();
  });
});
