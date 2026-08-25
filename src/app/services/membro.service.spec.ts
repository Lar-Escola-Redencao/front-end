import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { MembroService } from './membro.service';

describe('MembroService', () => {
  let service: MembroService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MembroService, provideHttpClient()]
    });
    service = TestBed.inject(MembroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
