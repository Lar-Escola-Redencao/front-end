import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UnidadeCard } from './unidade-card';
import { Unidade } from 'src/app/shared/models/unidade.model';

describe('Contatos e imagem do card de unidade', () => {
  let fixture: ComponentFixture<UnidadeCard>;
  let elemento: HTMLElement;
  let dialog: HTMLDialogElement;
  const unidade: Unidade = {
    id: 1, nome: 'Sede', endereco: 'Rua da Sede', telefone: '(16) 99111-1111',
    email: 'sede@exemplo.org', diasFuncionamento: 'SEG;TER;QUA;QUI;SEX',
    horarioAbertura: '06:00', horarioFechamento: '18:00', idadeMin: 6, idadeMax: 14,
    corHex: '#3682dc',
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(UnidadeCard);
    fixture.componentRef.setInput('unidade', unidade);
    fixture.componentRef.setInput('imagemUrl', '/images/sede.jpg');
    fixture.detectChanges();
    elemento = fixture.nativeElement;
    dialog = elemento.querySelector('dialog')!;
    dialog.showModal = () => dialog.setAttribute('open', '');
    dialog.close = () => {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    };
  });

  afterEach(() => fixture.destroy());

  it('preserva a máscara do telefone e usa apenas os dígitos para a ligação', () => {
    const telefone = elemento.querySelector<HTMLAnchorElement>('.telefone-link')!;
    expect(telefone.textContent).toBe('(16) 99111-1111');
    expect(telefone.getAttribute('href')).toBe('tel:16991111111');
  });

  it('abre a imagem completa e fecha ao clicar no fundo', () => {
    elemento.querySelector<HTMLButtonElement>('.card-imagem-botao')!.click();
    fixture.detectChanges();
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('img')?.getAttribute('src')).toBe('/images/sede.jpg');
    expect(dialog.querySelector('img')?.alt).toBe('Sede');
    expect(document.body.style.overflow).toBe('hidden');

    dialog.querySelector('img')!.click();
    expect(dialog.open).toBe(true);
    dialog.click();
    fixture.detectChanges();
    expect(dialog.open).toBe(false);
    expect(dialog.querySelector('img')).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('exibe o ícone padrão quando a imagem falha ou está ausente', () => {
    elemento.querySelector<HTMLImageElement>('.card-imagem')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(elemento.querySelector('.card-imagem-botao')).toBeNull();
    expect(elemento.querySelector('.card-imagem-fallback')).not.toBeNull();
    fixture.componentRef.setInput('imagemUrl', '');
    fixture.detectChanges();
    expect(elemento.querySelector('.card-imagem-botao')).toBeNull();
    expect(dialog.open).toBe(false);
  });
});
