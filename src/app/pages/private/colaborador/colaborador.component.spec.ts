import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { ColaboradorComponent } from './colaborador.component';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { Auth } from 'src/app/shared/services/auth/auth';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';
import { UnidadeService } from 'src/app/shared/services/colaborador/unidade.service';
import { ColaboradorService } from 'src/app/shared/services/colaborador/colaborador.service';
import { Colaborador } from 'src/app/shared/models/colaborador.model';
import { Alertas } from 'src/app/shared/utils/alerts';

describe('ColaboradorComponent', () => {
  let component: ColaboradorComponent;
  let fixture: ComponentFixture<ColaboradorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColaboradorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideToastr()]
    }).compileComponents();

    fixture = TestBed.createComponent(ColaboradorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).match(() => true).forEach(request => {
      if (request.request.url.endsWith('/papel/todos')) {
        request.flush([{ id: 1, nome: 'ADMINISTRADOR' }, { id: 2, nome: 'COORDENADOR' }, { id: 3, nome: 'MONITOR' }]);
      } else {
        request.flush({ content: [], page: { totalElements: 0, totalPages: 0, number: 0, size: 10 } });
      }
    });
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  afterEach(() => vi.restoreAllMocks());

  function configurarPerfil(papel: string, idsUnidades = [1]): void {
    vi.spyOn(TestBed.inject(Auth), 'hasRole').mockImplementation(role => role === papel);
    vi.spyOn(TestBed.inject(SessaoService), 'membro').mockReturnValue({
      id: 10, nomeCompleto: 'Solicitante', email: '', cpf: '', idPapel: 2,
      nomePapel: papel, unidades: idsUnidades.map(id => ({ id, nome: `Unidade ${id}` })),
    });
  }

  function monitor(idsUnidades: number[], nomePapel = 'MONITOR'): Colaborador {
    return { id: 20, nomeCompleto: 'Monitor teste', email: 'monitor@teste.com', cpf: '12345678900',
      endereco: 'Rua A', telefone: '11999999999', idPapel: 3, nomePapel,
      unidades: idsUnidades.map(id => ({ id, nome: `Unidade ${id}` })) };
  }

  for (const ids of [[2], [1, 2]]) {
    it(`oculta editar e excluir quando o monitor tem unidade não permitida: ${ids}`, () => {
      configurarPerfil('COORDENADOR');
      component.colaboradores = [monitor(ids)];
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button[title="Editar"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('button[title="Excluir"]')).toBeNull();
      component.executarAcao({ tipo: 'editar', linha: component.colaboradores[0] });
      expect(component.modalAberto).toBe(false);
    });
  }

  it('permite editar e excluir monitor somente das próprias unidades', () => {
    configurarPerfil('COORDENADOR', [1, 2]);
    component.colaboradores = [monitor([1, 2])];
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button[title="Editar"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('button[title="Excluir"]')).toBeTruthy();
    component.abrirEdicao(component.colaboradores[0]);
    expect(component.modalAberto).toBe(true);
  });

  it('não permite coordenador editar outro coordenador ou um monitor sem unidade', () => {
    configurarPerfil('COORDENADOR');
    component.abrirEdicao(monitor([1], 'COORDENADOR'));
    expect(component.modalAberto).toBe(false);
    component.abrirEdicao(monitor([]));
    expect(component.modalAberto).toBe(false);
  });

  it('preserva a edição do administrador em qualquer unidade', () => {
    configurarPerfil('ADMINISTRADOR', []);
    component.abrirEdicao(monitor([2]));
    expect(component.modalAberto).toBe(true);
  });

  it('bloqueia a chamada direta de exclusão antes de abrir a confirmação', () => {
    configurarPerfil('COORDENADOR');
    const confirmar = vi.spyOn(Alertas, 'confirmarExclusao').mockResolvedValue(true);
    const deletar = vi.spyOn(TestBed.inject(ColaboradorService), 'deletar');
    component.deletarColaborador(monitor([2]));
    expect(confirmar).not.toHaveBeenCalled();
    expect(deletar).not.toHaveBeenCalled();
  });

  it('reconfere a permissão original ao salvar mesmo se a unidade do formulário for trocada', () => {
    configurarPerfil('COORDENADOR');
    component.abrirEdicao(monitor([1]));
    component.formColaborador.patchValue({ nomeCompleto: 'Nome alterado', idsUnidades: [2] });
    vi.mocked(TestBed.inject(SessaoService).membro).mockReturnValue({
      id: 10, nomeCompleto: 'Solicitante', email: '', cpf: '', idPapel: 2,
      nomePapel: 'COORDENADOR', unidades: [{ id: 2, nome: 'Unidade 2' }],
    });
    const atualizar = vi.spyOn(TestBed.inject(ColaboradorService), 'atualizar');
    component.salvar();
    expect(atualizar).not.toHaveBeenCalled();
  });

  it('oferece apenas as unidades vinculadas ao coordenador', () => {
    vi.spyOn(TestBed.inject(Auth), 'hasRole').mockReturnValue(true);
    vi.spyOn(TestBed.inject(UnidadeService), 'listarTodos').mockReturnValue(of([
      { id: 1, nome: 'Unidade 1' }, { id: 2, nome: 'Unidade 2' }, { id: 3, nome: 'Unidade 3' }
    ]));
    const sessao = vi.spyOn(TestBed.inject(SessaoService), 'carregar');
    for (const ids of [[1, 2], [3], []]) {
      sessao.mockReturnValue(of({ id: 10, nomeCompleto: 'Coordenador', email: '', cpf: '',
        idPapel: 2, nomePapel: 'COORDENADOR', unidades: ids.map(id => ({ id, nome: `Unidade ${id}` })) }));
      component.carregarUnidades();
      expect(component.unidadesDisponiveis.map(unidade => unidade.id)).toEqual(ids);
    }
  });

  it('oculta unidades e permite administrador sem vínculos manuais', () => {
    component.abrirCadastro();
    component.formColaborador.get('idPapel')!.setValue(1);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.unidades-box')).toBeNull();
    expect(component.formColaborador.get('idsUnidades')!.disabled).toBe(true);
    expect(component.formColaborador.value.idsUnidades).toBeUndefined();
  });

  it('volta a exigir unidades ao trocar administrador por coordenador ou monitor', () => {
    component.abrirCadastro();
    for (const idPapel of [2, 3]) {
      component.formColaborador.get('idPapel')!.setValue(1);
      component.formColaborador.get('idPapel')!.setValue(idPapel);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.unidades-box')).not.toBeNull();
      expect(component.formColaborador.get('idsUnidades')!.hasError('required')).toBe(true);
    }
  });
});
