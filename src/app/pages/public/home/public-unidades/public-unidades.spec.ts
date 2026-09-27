import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { PublicUnidadesComponent } from './public-unidades';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';

describe('PublicUnidadesComponent', () => {
  let fixture: ComponentFixture<PublicUnidadesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicUnidadesComponent],
      providers: [
        {
          provide: PublicContentService,
          useValue: {
            getUnidades: () => of([
              criarUnidade(1, 'Sede Sao Jose', '#7caf2a'),
              criarUnidade(2, 'Bezerra de Menezes', '#3682dc'),
              criarUnidade(3, 'SOS Bombeiros', '#df0000')
            ]),
            tratarUrlImagem: (url: string | null | undefined) => url ?? ''
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PublicUnidadesComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renderiza a contagem dinamica e as setas do carrossel', () => {
    const elemento: HTMLElement = fixture.nativeElement;

    expect(elemento.querySelector('.unidades-descricao')?.textContent).toContain('3 unidades de atendimento');
    expect(elemento.querySelectorAll('.unidades-seta').length).toBe(2);
  });

  it('usa a cor recuperada na bolinha numerada da unidade', () => {
    const elemento: HTMLElement = fixture.nativeElement;
    const primeiraBolinha = elemento.querySelector<HTMLElement>('.badge-numero');

    expect(primeiraBolinha?.style.backgroundColor).toBe('rgb(124, 175, 42)');
  });
});

function criarUnidade(id: number, nome: string, corHex: string) {
  return {
    id,
    nome,
    endereco: 'Av. Lar Escola Redencao',
    telefone: '(16) 98563-1254',
    email: 'larescolaredencao@gmail.com',
    diasFuncionamento: 'SEG;TER;QUA;QUI;SEX',
    horarioAbertura: '06:00',
    horarioFechamento: '17:00',
    idadeMin: 6,
    idadeMax: 14,
    corHex,
    imagem: `unidade-${id}.jpg`
  };
}
