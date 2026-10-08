import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { SessaoService } from './sessao.service';

describe('SessaoService', () => {
  it('compartilha o carregamento da sessao enquanto a primeira requisicao esta pendente', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    const sessao = TestBed.inject(SessaoService);
    const httpMock = TestBed.inject(HttpTestingController);
    const valores: unknown[] = [];

    sessao.carregar().subscribe(valor => valores.push(valor));
    sessao.carregar().subscribe(valor => valores.push(valor));

    const requisicoes = httpMock.match(`${environment.apiUrl}/membro/me`);
    expect(requisicoes).toHaveLength(1);

    requisicoes[0].flush({ nomePapel: 'COORDENADOR', unidades: [] });

    expect(valores).toEqual([
      { nomePapel: 'COORDENADOR', unidades: [] },
      { nomePapel: 'COORDENADOR', unidades: [] }
    ]);
    expect(sessao.isCoordenador()).toBe(true);
    httpMock.verify();
  });
});
