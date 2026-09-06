import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Eventos } from './eventos';
import { Evento, TipoEvento } from 'src/app/shared/models/evento.model';
import { EventoPublicoService } from 'src/app/shared/services/evento-publico/evento-publico.service';

describe('Eventos', () => {
  let component: Eventos;
  let fixture: ComponentFixture<Eventos>;

  const eventos = Array.from({ length: 7 }, (_, index): Evento => ({
    id: index + 1,
    titulo: `Evento ${index + 1}`,
    descricao: `Descricao ${index + 1}`,
    dataEvento: new Date(2099, 0, index + 1, 10),
    endereco: 'Rua Teste',
    imagem: 'imagem.jpg',
    valor: index === 6 ? 10 : undefined,
    tipoEvento: TipoEvento.CULTURAL,
    parceiros: []
  }));

  const eventoPublicoServiceMock = {
    listarPublicos: vi.fn(() => of(eventos))
  };

  beforeEach(async () => {
    eventoPublicoServiceMock.listarPublicos.mockReturnValue(of(eventos));

    await TestBed.configureTestingModule({
      imports: [Eventos],
      providers: [
        {
          provide: EventoPublicoService,
          useValue: eventoPublicoServiceMock
        },
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Eventos);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('deve exibir no maximo 6 eventos por pagina', () => {
    expect(component.tamanhoPagina).toBe(6);
    expect(component.eventosPaginados).toHaveLength(6);
    expect(component.eventosPaginados[0].id).toBe(1);
    expect(component.eventosPaginados[5].id).toBe(6);
  });

  it('deve exibir eventos excedentes ao navegar para a proxima pagina', () => {
    component.proximaPagina();

    expect(component.eventosPaginados).toHaveLength(1);
    expect(component.eventosPaginados[0].id).toBe(7);
  });

  it('deve reiniciar para a primeira pagina ao buscar com filtros', () => {
    component.proximaPagina();

    component.filtroValor = 'gratuito';
    component.buscar();

    expect(component.paginaAtual).toBe(0);
    expect(component.eventosPaginados).toHaveLength(6);
    expect(component.eventosPaginados.some(evento => evento.valor)).toBe(false);
  });

  it('nao deve exibir seletor ou rotulo de itens por pagina', () => {
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;

    expect(elemento.textContent).not.toContain('Itens por pagina');
    expect(elemento.textContent).not.toContain('Itens por página');
    expect(elemento.querySelector('.paginacao-registros')?.textContent).toContain('Mostrando 1-6 de 7 registros');
  });

  it('deve manter botoes de navegacao do paginador disponiveis', () => {
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;

    expect(elemento.querySelector('[aria-label="Primeira página"]')).toBeTruthy();
    expect(elemento.querySelector('[aria-label="Página anterior"]')).toBeTruthy();
    expect(elemento.querySelector('[aria-label="Próxima página"]')).toBeTruthy();
    expect(elemento.querySelector('[aria-label="Última página"]')).toBeTruthy();
    expect(elemento.textContent).toContain('Página 1 de 2');
  });

  it('deve desativar botoes conforme a pagina atual', () => {
    fixture.detectChanges();

    const obterBotao = (label: string) =>
      fixture.nativeElement.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement;

    expect(obterBotao('Primeira página').disabled).toBe(true);
    expect(obterBotao('Página anterior').disabled).toBe(true);
    expect(obterBotao('Próxima página').disabled).toBe(false);
    expect(obterBotao('Última página').disabled).toBe(false);

    component.ultimaPagina();
    fixture.detectChanges();

    expect(obterBotao('Primeira página').disabled).toBe(false);
    expect(obterBotao('Página anterior').disabled).toBe(false);
    expect(obterBotao('Próxima página').disabled).toBe(true);
    expect(obterBotao('Última página').disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Página 2 de 2');
  });

  it('deve abrir e fechar o drawer de filtros mobile preservando valores', () => {
    component.filtroTitulo = 'Evento';
    component.abrirFiltrosMobile();
    fixture.detectChanges();

    const elementoAberto = fixture.nativeElement as HTMLElement;

    expect(component.filtrosMobileAberto).toBe(true);
    expect(elementoAberto.querySelector('app-modal-layout')).toBeTruthy();

    component.fecharFiltrosMobile();
    fixture.detectChanges();

    const elementoFechado = fixture.nativeElement as HTMLElement;

    expect(component.filtrosMobileAberto).toBe(false);
    expect(component.filtroTitulo).toBe('Evento');
    expect(elementoFechado.querySelector('app-modal-layout')).toBeNull();
  });

  it('deve fechar o drawer de filtros ao voltar para largura desktop', () => {
    component.abrirFiltrosMobile();

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 641
    });

    component.aoRedimensionarJanela();

    expect(component.filtrosMobileAberto).toBe(false);
  });

  it('deve aplicar filtros pelo drawer mobile e fechar o drawer', () => {
    component.abrirFiltrosMobile();
    component.proximaPagina();

    component.filtroValor = 'pago';
    component.buscarMobile();

    expect(component.filtrosMobileAberto).toBe(false);
    expect(component.paginaAtual).toBe(0);
    expect(component.eventosPaginados).toHaveLength(1);
    expect(component.eventosPaginados[0].id).toBe(7);
  });

  it('deve exibir opcao textual para limpar filtros quando houver filtro preenchido', () => {
    expect(component.possuiFiltrosAplicados).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Limpar filtros');

    component.filtroTitulo = 'Evento 7';
    fixture.detectChanges();

    expect(component.possuiFiltrosAplicados).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Limpar filtros');
  });

  it('deve limpar filtros rapidamente e voltar para a primeira pagina', () => {
    component.proximaPagina();
    component.filtroTitulo = 'Evento 7';
    component.filtroDataInicial = '2099-01-01';
    component.filtroDataFinal = '2099-01-31';
    component.filtroValor = 'pago';

    component.limparFiltros();

    expect(component.filtroTitulo).toBe('');
    expect(component.filtroDataInicial).toBe('');
    expect(component.filtroDataFinal).toBe('');
    expect(component.filtroValor).toBe('todos');
    expect(component.paginaAtual).toBe(0);
    expect(component.eventosPaginados).toHaveLength(6);
  });
});
