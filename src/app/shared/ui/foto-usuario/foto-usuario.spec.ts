import { Component, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { SILENCIAR_TOAST_ACESSO } from '../../interceptors/acesso-toast.context';
import { FotoUsuario } from './foto-usuario';

@Component({
  standalone: true,
  imports: [FotoUsuario],
  template: `
    @if (visivel()) {
      <app-foto-usuario [caminho]="caminho()" classeImagem="avatar" alt="Foto">
        <span class="padrao">sem foto</span>
      </app-foto-usuario>
    }
  `,
})
class Hospedeiro {
  readonly caminho = signal<string | null>(null);
  readonly visivel = signal(true);
}

describe('FotoUsuario', () => {
  let http: HttpTestingController;
  let criar: ReturnType<typeof vi.fn>;
  let liberar: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    criar = vi.fn(() => 'blob:foto-1');
    liberar = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: criar, revokeObjectURL: liberar }));
    TestBed.configureTestingModule({
      imports: [Hospedeiro],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function montar(caminho: string | null) {
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.componentInstance.caminho.set(caminho);
    fixture.detectChanges();
    return fixture;
  }

  it('exibe a imagem padrão quando não há foto cadastrada', () => {
    const fixture = montar(null);
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.padrao')).not.toBeNull();
  });

  it('carrega a foto pela rota protegida, sem toast de acesso, e libera a URL ao destruir', () => {
    const fixture = montar('/usuarios/7/foto?v=ab');
    const req = http.expectOne(`${environment.apiUrl}/usuarios/7/foto?v=ab`);
    expect(req.request.responseType).toBe('blob');
    expect(req.request.context.get(SILENCIAR_TOAST_ACESSO)).toBe(true);
    req.flush(new Blob(['x'], { type: 'image/jpeg' }));
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('blob:foto-1');
    expect(img.classList).toContain('avatar');

    fixture.componentInstance.visivel.set(false);
    fixture.detectChanges();
    expect(liberar).toHaveBeenCalledWith('blob:foto-1');
  });

  it('volta para a imagem padrão quando o acesso é negado', () => {
    const fixture = montar('/usuarios/8/foto?v=cd');
    http.expectOne(`${environment.apiUrl}/usuarios/8/foto?v=cd`)
      .flush(new Blob(), { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.padrao')).not.toBeNull();
  });

  it('libera a URL anterior ao trocar de foto', () => {
    const fixture = montar('/usuarios/7/foto?v=ab');
    http.expectOne(`${environment.apiUrl}/usuarios/7/foto?v=ab`).flush(new Blob(['x'], { type: 'image/png' }));
    fixture.detectChanges();

    fixture.componentInstance.caminho.set('/usuarios/7/foto?v=ef');
    fixture.detectChanges();
    expect(liberar).toHaveBeenCalledWith('blob:foto-1');
    http.expectOne(`${environment.apiUrl}/usuarios/7/foto?v=ef`).flush(new Blob(['y'], { type: 'image/png' }));
  });

  it('exibe prévias locais sem requisição e não tenta acessar URLs antigas de /uploads', () => {
    const fixture = montar('data:image/png;base64,AAA');
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe('data:image/png;base64,AAA');

    fixture.componentInstance.caminho.set('/uploads/usuarios/foto.jpg');
    fixture.detectChanges();
    http.expectNone(() => true);
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });

  it('cai para a imagem padrão se o navegador não conseguir exibir a imagem', () => {
    const fixture = montar('/usuarios/7/foto?v=ab');
    http.expectOne(`${environment.apiUrl}/usuarios/7/foto?v=ab`).flush(new Blob(['x'], { type: 'image/png' }));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('img').dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(liberar).toHaveBeenCalledWith('blob:foto-1');
    expect(fixture.nativeElement.querySelector('.padrao')).not.toBeNull();
  });
});
