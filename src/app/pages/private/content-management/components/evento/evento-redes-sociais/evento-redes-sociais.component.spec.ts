import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { EventoRedesSociaisComponent } from './evento-redes-sociais.component';
import { TipoEvento } from 'src/app/shared/models/evento.model';
import { SocialLinksService } from 'src/app/shared/services/content-management/redes-sociais/social-links.service';
import { EventoService } from 'src/app/shared/services/content-management/evento/evento.service';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';

describe('EventoRedesSociaisComponent', () => {
  let fixture: ComponentFixture<EventoRedesSociaisComponent>;
  let component: EventoRedesSociaisComponent;
  let payloadsVinculo: Array<{ idEvento: number; dto: { idRedeSocial: number; urlLink?: string } }>;

  const socialLinksService = {
    listarParaVinculoEvento: () => Promise.resolve([
      { id: 1, nome: 'Instagram', url: 'https://instagram.com/ler', icone: '/images/instagram.svg', ativo: true },
      { id: 2, nome: 'WhatsApp', url: 'https://wa.me/5500000000000', icone: '/images/whatsapp.svg', ativo: true },
      { id: 3, nome: 'Facebook', url: 'https://facebook.com/ler', icone: '/images/facebook.svg', ativo: false },
    ])
  };

  const eventoService = {
    listarRedesSociais: () => of([]),
    vincularRedeSocial: (idEvento: number, dto: { idRedeSocial: number; urlLink?: string }) => {
      payloadsVinculo.push({ idEvento, dto });
      return of({
        idRedeSocial: dto.idRedeSocial,
        nome: 'Facebook',
        icone: '/images/facebook.svg',
        urlLink: dto.urlLink ?? ''
      });
    }
  };

  beforeEach(async () => {
    payloadsVinculo = [];

    await TestBed.configureTestingModule({
      imports: [EventoRedesSociaisComponent],
      providers: [
        { provide: SocialLinksService, useValue: socialLinksService },
        { provide: EventoService, useValue: eventoService },
        { provide: PublicContentService, useValue: { tratarUrlImagem: (url: string) => url } },
        { provide: ToastrService, useValue: { success: () => {}, error: () => {} } },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EventoRedesSociaisComponent);
    component = fixture.componentInstance;
    component.evento = {
      id: 10,
      titulo: 'Evento teste',
      descricao: '',
      dataEvento: new Date('2026-10-03T12:00:00'),
      endereco: '',
      imagem: '',
      tipoEvento: TipoEvento.CULTURAL,
      parceiros: []
    };
  });

  it('lista todas as redes sociais exceto WhatsApp sem preencher o link por padrao', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    TestBed.inject(NgZone).run(() => fixture.detectChanges());

    expect(component.linhas.map(linha => linha.nome)).toEqual(['Facebook', 'Instagram']);
    expect(component.linhas.every(linha => linha.urlLink === '')).toBe(true);

    const input = fixture.nativeElement.querySelector('.input-link') as HTMLInputElement;
    expect(input.getAttribute('placeholder')).toBeNull();
  });

  it('nao exibe botao concluir porque os vinculos sao salvos por linha', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    TestBed.inject(NgZone).run(() => fixture.detectChanges());

    expect(fixture.nativeElement.textContent).not.toContain('Concluir');
  });

  it('separa icone, nome e link para manter o alinhamento da tabela', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    TestBed.inject(NgZone).run(() => fixture.detectChanges());

    const celulaIcone = fixture.nativeElement.querySelector('.celula-icone') as HTMLElement;
    const celulaRede = fixture.nativeElement.querySelector('.celula-rede') as HTMLElement;
    const campoLink = fixture.nativeElement.querySelector('.campo-link') as HTMLElement;
    const estilos = getComputedStyle(celulaRede);

    expect(celulaIcone.querySelector('.rede-icone')).not.toBeNull();
    expect(celulaRede.textContent?.trim()).toBe('Facebook');
    expect(campoLink.tagName.toLowerCase()).toBe('mat-form-field');
    expect(campoLink.querySelector('mat-label')).not.toBeNull();
    expect(campoLink.querySelector('.input-link')?.hasAttribute('matinput')).toBe(true);
    expect(estilos.display).toBe('table-cell');
    expect(estilos.verticalAlign).toBe('middle');
  });

  it('nao vincula rede social sem link digitado', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    TestBed.inject(NgZone).run(() => fixture.detectChanges());

    const facebook = component.linhas.find(linha => linha.nome === 'Facebook')!;
    component.salvar(facebook);

    expect(payloadsVinculo).toEqual([]);
    expect(facebook.erro).toBe('Informe o link da publicação');
  });

  it('envia o link digitado pelo usuario ao vincular', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    TestBed.inject(NgZone).run(() => fixture.detectChanges());

    const facebook = component.linhas.find(linha => linha.nome === 'Facebook')!;
    facebook.urlLink = 'https://facebook.com/publicacao-do-evento';
    component.salvar(facebook);

    expect(payloadsVinculo).toEqual([{
      idEvento: 10,
      dto: {
        idRedeSocial: 3,
        urlLink: 'https://facebook.com/publicacao-do-evento'
      }
    }]);
  });
});
