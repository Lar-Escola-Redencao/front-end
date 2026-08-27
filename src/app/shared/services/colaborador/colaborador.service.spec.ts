import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ColaboradorService } from './colaborador.service';

describe('ColaboradorService', () => {
  let service: ColaboradorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ColaboradorService, provideHttpClient()]
    });
    service = TestBed.inject(ColaboradorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
