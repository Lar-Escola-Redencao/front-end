import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { EventoComponent } from './evento.component';
import { Evento, TipoEvento } from 'src/app/shared/models/evento.model';

describe('Categorias dos eventos', () => {
  beforeEach(() => {
    vi.spyOn(EventoComponent.prototype, 'ngOnInit').mockImplementation(() => {});
    TestBed.configureTestingModule({
      imports: [EventoComponent],
      providers: [provideHttpClient(), provideRouter([]),
        { provide: ToastrService, useValue: { error: vi.fn(), success: vi.fn() } }]
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('permite selecionar várias categorias e valida a remoção da última', () => {
    const fixture = TestBed.createComponent(EventoComponent);
    const componente = fixture.componentInstance;
    componente.abrirCadastro();
    fixture.detectChanges();
    const caixas = fixture.nativeElement.querySelectorAll('.categorias-box input') as NodeListOf<HTMLInputElement>;
    expect(caixas.length).toBe(5);
    caixas[0].click();
    caixas[1].click();
    expect(componente.formEvento.get('categorias')?.value).toEqual([TipoEvento.BENEFICENTE, TipoEvento.CULTURAL]);
    caixas[0].click();
    caixas[1].click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#categorias-erro').textContent)
      .toContain('Selecione pelo menos uma categoria.');
    expect(componente.formEvento.dirty).toBe(true);
  });

  it('abre a edição com todas as categorias existentes marcadas', () => {
    const fixture = TestBed.createComponent(EventoComponent);
    const componente = fixture.componentInstance;
    componente.abrirEdicao({ id: 1, titulo: 'Noite italiana', descricao: 'Jantar e música',
      dataEvento: new Date('2027-01-10T19:00:00'), endereco: 'Rua das Flores', imagem: '',
      categorias: [TipoEvento.BENEFICENTE, TipoEvento.CULTURAL], parceiros: [] } as Evento);
    fixture.detectChanges();
    const caixas = fixture.nativeElement.querySelectorAll('.categorias-box input') as NodeListOf<HTMLInputElement>;
    expect(Array.from(caixas).map(caixa => caixa.checked)).toEqual([true, true, false, false, false]);
    expect(componente.temAlteracoes).toBe(false);
  });

  it('permite marcar e desmarcar parceiros dentro do select', async () => {
    const fixture = TestBed.createComponent(EventoComponent);
    const componente = fixture.componentInstance;
    componente.parceiros = [{ id: 2, nome: 'Parceiro A' }, { id: 3, nome: 'Parceiro B' }];
    componente.abrirCadastro();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('mat-select') as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    const opcoes = document.querySelectorAll('mat-option') as NodeListOf<HTMLElement>;
    expect(opcoes.length).toBe(2);
    opcoes[0].click();
    opcoes[1].click();
    expect(componente.formEvento.get('parceirosIds')?.value).toEqual([2, 3]);
    expect(componente.formEvento.dirty).toBe(true);
    opcoes[0].click();
    opcoes[1].click();
    expect(componente.formEvento.get('parceirosIds')?.value).toEqual([]);
  });
});
