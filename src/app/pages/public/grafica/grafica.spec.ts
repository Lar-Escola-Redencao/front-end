import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from 'src/environments/environment';
import { Secao } from 'src/app/shared/services/pagina/pagina-cms.service';
import { Grafica, normalizarTelefoneWhatsapp } from './grafica';

describe('normalizarTelefoneWhatsapp', () => {
  it('adds the country code to national numbers, including DDD 55', () => {
    expect(normalizarTelefoneWhatsapp('(55) 99999-8888')).toBe('5555999998888');
    expect(normalizarTelefoneWhatsapp('(55) 3222-1111')).toBe('555532221111');
    expect(normalizarTelefoneWhatsapp('(11) 98765-4321')).toBe('5511987654321');
  });

  it('keeps numbers that already have the country code', () => {
    expect(normalizarTelefoneWhatsapp('+55 55 99999-8888')).toBe('5555999998888');
    expect(normalizarTelefoneWhatsapp('+55 (11) 98765-4321')).toBe('5511987654321');
    expect(normalizarTelefoneWhatsapp('55 11 3222-1111')).toBe('551132221111');
  });

  it('ignores the trunk prefix 0', () => {
    expect(normalizarTelefoneWhatsapp('0 (55) 99999-8888')).toBe('5555999998888');
  });

  it('returns null for empty or invalid numbers', () => {
    expect(normalizarTelefoneWhatsapp(null)).toBeNull();
    expect(normalizarTelefoneWhatsapp('   ')).toBeNull();
    expect(normalizarTelefoneWhatsapp('9999-8888')).toBeNull();
  });
});

describe('Grafica', () => {
  let fixture: ComponentFixture<Grafica>;
  let httpMock: HttpTestingController;
  const url = `${environment.apiUrl}/paginas/3/secoes`;

  const secoesMock: Secao[] = [
    { id: 1, titulo: 'Cartões de visita', grupo: 'nenhum', ordem: 1, ativo: true },
    { id: 2, titulo: '(55) 99999-8888', grupo: 'telefone', conteudo: 'grafica@exemplo.com', ativo: true },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Grafica],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    fixture = TestBed.createComponent(Grafica);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('renders products and a WhatsApp link with the country code for DDD 55', () => {
    httpMock.expectOne(url).flush(secoesMock);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.produto-card').length).toBe(1);
    expect(el.querySelector<HTMLAnchorElement>('.btn-whatsapp')?.href).toContain(
      'https://wa.me/5555999998888?text=',
    );
  });

  it('leaves the loading state and shows the empty message when the API returns null', () => {
    httpMock.expectOne(url).flush(null);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.spinner')).toBeNull();
    expect(el.querySelector('.mensagem-vazia')).not.toBeNull();
    expect(el.querySelector('.contato-section')).toBeNull();
  });
});
