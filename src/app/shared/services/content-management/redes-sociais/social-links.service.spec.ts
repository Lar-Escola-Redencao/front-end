import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { SocialLinksService } from './social-links.service';
import { environment } from '../../../../../environments/environment';

describe('SocialLinksService', () => {
  let service: SocialLinksService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SocialLinksService, provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(SocialLinksService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lista redes para vinculo de evento sem WhatsApp', async () => {
    const promise = service.listarParaVinculoEvento();

    const req = httpMock.expectOne(`${environment.apiUrl}/rede-social/todas`);
    req.flush([
      { id: 1, nome: 'Instagram', url: 'https://instagram.com/ler', icone: '', ativo: true },
      { id: 2, nome: ' WhatsApp ', url: 'https://wa.me/5500000000000', icone: '', ativo: true },
      { id: 3, nome: 'Facebook', url: 'https://facebook.com/ler', icone: '', ativo: false },
    ]);

    await expect(promise).resolves.toEqual([
      { id: 1, nome: 'Instagram', url: 'https://instagram.com/ler', icone: '', ativo: true },
      { id: 3, nome: 'Facebook', url: 'https://facebook.com/ler', icone: '', ativo: false },
    ]);
  });
});
