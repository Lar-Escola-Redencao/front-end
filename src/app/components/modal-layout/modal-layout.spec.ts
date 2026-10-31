import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalLayout } from './modal-layout';

describe('ModalLayout', () => {
  let component: ModalLayout;
  let fixture: ComponentFixture<ModalLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalLayout],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('fecha ao clicar no fundo por padrão, mas não no conteúdo', () => {
    let fechamentos = 0;
    component.closed.subscribe(() => fechamentos++);
    fixture.nativeElement.querySelector('.modal-card').click();
    expect(fechamentos).toBe(0);
    fixture.nativeElement.querySelector('.modal-backdrop').click();
    expect(fechamentos).toBe(1);
  });

  it('permite tratar o clique no fundo sem fechar e preserva o botão de fechar', () => {
    component.fecharAoClicarFora = false;
    let cliquesFora = 0;
    let fechamentos = 0;
    component.backdropClick.subscribe(() => cliquesFora++);
    component.closed.subscribe(() => fechamentos++);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.modal-backdrop').click();
    expect(cliquesFora).toBe(1);
    expect(fechamentos).toBe(0);
    fixture.nativeElement.querySelector('.modal-close').click();
    expect(fechamentos).toBe(1);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
