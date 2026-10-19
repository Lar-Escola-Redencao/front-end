import { ChangeDetectorRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { SecoesGrupoService } from 'src/app/shared/services/pagina/secoes-grupo.service';
import { CaptacaoRecursos } from './captacao-recursos';
import { CAPTACAO_RECURSOS_CONFIG } from './captacao-recursos.config';

describe('CaptacaoRecursos pagination', () => {
  let component: CaptacaoRecursos;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let service: { listarPorGrupo: ReturnType<typeof vi.fn>; listarPorGrupoPaginado: ReturnType<typeof vi.fn> };
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    params = new BehaviorSubject(convertToParamMap({ page: '1', size: '5' }));
    service = {
      listarPorGrupo: vi.fn(() => of([])),
      listarPorGrupoPaginado: vi.fn(() => of({
        content: [{ id: 1, grupo: 'produtos', titulo: 'Caneca', ativo: true }],
        page: { number: 1, size: 5, totalElements: 6, totalPages: 2 },
      })),
    };
    navigate = vi.fn();
    component = new CaptacaoRecursos(
      new FormBuilder(), service as unknown as SecoesGrupoService,
      { error: vi.fn() } as unknown as ToastrService,
      { detectChanges: vi.fn() } as unknown as ChangeDetectorRef,
      { queryParamMap: params } as unknown as ActivatedRoute,
      { navigate } as unknown as Router,
    );
    component.config = CAPTACAO_RECURSOS_CONFIG.find((config) => config.secao === 'grafica')!;
  });

  afterEach(() => component.ngOnDestroy());

  it('loads only the requested page and uses the returned totals', () => {
    component.ngOnInit();
    expect(service.listarPorGrupoPaginado).toHaveBeenCalledWith(3, 'produtos', 1, 5, undefined);
    expect(service.listarPorGrupo).not.toHaveBeenCalled();
    expect(component.totalElementos).toBe(6);
    expect(component.totalPaginas).toBe(2);
    expect(component.itens).toHaveLength(1);
  });

  it('reloads when the page changes through the URL', () => {
    component.ngOnInit();
    params.next(convertToParamMap({ page: '0', size: '5', search: 'Caneca' }));
    expect(service.listarPorGrupoPaginado).toHaveBeenLastCalledWith(3, 'produtos', 0, 5, 'Caneca');
  });

  it('resets the page when searching or changing the page size', () => {
    component.ngOnInit();
    component.buscar('Caneca');
    expect(navigate.mock.lastCall?.[1].queryParams).toEqual({ search: 'Caneca', page: 0 });
    component.mudarTamanhoPagina(25);
    expect(navigate.mock.lastCall?.[1].queryParams).toEqual({ size: 25, page: 0 });
  });

  it('returns to the last available page when the current page becomes empty', () => {
    service.listarPorGrupoPaginado.mockReturnValue(of({
      content: [], page: { number: 1, size: 5, totalElements: 5, totalPages: 1 },
    }));
    component.ngOnInit();
    expect(navigate.mock.lastCall?.[1].queryParams).toEqual({ page: 0 });
  });

  it('keeps single-record Pix on the unpaginated route', () => {
    component.config = CAPTACAO_RECURSOS_CONFIG.find((config) => config.secao === 'pix')!;
    component.ngOnInit();
    expect(service.listarPorGrupo).toHaveBeenCalledWith(4, 'pix', undefined);
    expect(service.listarPorGrupoPaginado).not.toHaveBeenCalled();
    expect(component.exibePaginacao).toBe(false);
  });

  it('keeps Contato without pagination', () => {
    params.next(convertToParamMap({ aba: 'telefone' }));
    component.ngOnInit();
    expect(service.listarPorGrupo).toHaveBeenCalledWith(3, 'telefone');
    expect(service.listarPorGrupoPaginado).not.toHaveBeenCalled();
    expect(component.exibePaginacao).toBe(false);
  });

  it('uses the product and service empty message', () => {
    component.ngOnInit();
    expect(component.grupoAtivo.rotuloAba).toBe('Produtos e serviços');
    expect(component.mensagemVazia).toBe('Nenhum produto ou serviço cadastrado.');
  });
});
