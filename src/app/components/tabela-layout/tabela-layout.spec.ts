import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TabelaColuna, TabelaLayout } from './tabela-layout';

describe('TabelaLayout', () => {
  let component: TabelaLayout;
  let fixture: ComponentFixture<TabelaLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabelaLayout],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TabelaLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('nomes com link abrem o perfil no desktop e mobile sem acionar a expansão', () => {
    const colunas: TabelaColuna<{ id: number; nome: string }>[] = [{ chave: 'nome', titulo: 'Usuário', principalMobile: true,
      link: (linha: { id: number }) => ['/dashboard/usuarios', linha.id],
      parametrosLink: () => ({ origem: 'usuarios', search: 'Ana' }),
    }];
    fixture.componentRef.setInput('colunas', colunas);
    fixture.componentRef.setInput('dados', [{ id: 7, nome: 'Ana' }]); fixture.detectChanges();
    const links = fixture.nativeElement.querySelectorAll('a.tabela-link') as NodeListOf<HTMLAnchorElement>;
    expect(links.length).toBe(2);
    links.forEach(link => expect(link.getAttribute('href')).toBe('/dashboard/usuarios/7?origem=usuarios&search=Ana'));
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    links[0].addEventListener('click', evento => evento.preventDefault());
    links[0].dispatchEvent(evento);
    expect(component.linhaExpandida).toBeNull();
  });
});
