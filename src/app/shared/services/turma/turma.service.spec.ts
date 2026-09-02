import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { TurmaService } from './turma.service';
import { CriarTurmaDTO } from '../../models/turma.model';

describe('TurmaService', () => {
  let service: TurmaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(TurmaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists turmas without a query param when no unidadeId is given', () => {
    service.listar().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/turmas/Listar`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('unidadeId')).toBe(false);
    req.flush([]);
  });

  it('sends unidadeId as a query param when filtering by unidade', () => {
    service.listar(7).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/turmas/Listar` && r.params.get('unidadeId') === '7',
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('fetches a turma by id', () => {
    service.buscarPorId(5).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/turmas/busca/5`);
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 5,
      periodo: 'MANHA',
      horaInicio: '08:00:00',
      horaFim: '12:00:00',
      unidade: { id: 1, nome: 'Sede' },
    });
  });

  it('posts to /turmas/Criar with the horário normalized to HH:mm:ss', () => {
    const dto: CriarTurmaDTO = {
      periodo: 'TARDE',
      horaInicio: '13:00',
      horaFim: '17:00',
      unidadeId: 3,
    };

    service.criar(dto).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/turmas/Criar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      periodo: 'TARDE',
      horaInicio: '13:00:00',
      horaFim: '17:00:00',
      unidadeId: 3,
    });
    req.flush({
      id: 10,
      periodo: 'TARDE',
      horaInicio: '13:00:00',
      horaFim: '17:00:00',
      unidade: { id: 3, nome: 'Anexo' },
    });
  });

  it('puts to /turmas/atualizar/{id} with the correct unidade id in the payload', () => {
    const dto: CriarTurmaDTO = {
      periodo: 'NOITE',
      horaInicio: '18:00',
      horaFim: '21:00',
      unidadeId: 9,
    };

    service.atualizar(4, dto).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/turmas/atualizar/4`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.unidadeId).toBe(9);
    req.flush({
      id: 4,
      periodo: 'NOITE',
      horaInicio: '18:00:00',
      horaFim: '21:00:00',
      unidade: { id: 9, nome: 'Sede' },
    });
  });

  it('deletes via DELETE /turmas/deletar/{id} and handles the empty 204 body', () => {
    let concluido = false;
    service.deletar(8).subscribe({ complete: () => (concluido = true) });

    const req = httpMock.expectOne(`${environment.apiUrl}/turmas/deletar/8`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(concluido).toBe(true);
  });

  it('normalizes a "HH:mm:ss" horário to "HH:mm" when listing', () => {
    let resultado: any;
    service.listar().subscribe((turmas) => (resultado = turmas));

    const req = httpMock.expectOne(`${environment.apiUrl}/turmas/Listar`);
    req.flush([
      {
        id: 1,
        periodo: 'MANHA',
        horaInicio: '08:00:00',
        horaFim: '12:00:00',
        unidade: { id: 1, nome: 'Sede' },
      },
    ]);

    expect(resultado[0].horaInicio).toBe('08:00');
    expect(resultado[0].horaFim).toBe('12:00');
  });

  it('normalizes a Jackson array-format horário ([h, m, s]) to "HH:mm" when listing', () => {
    let resultado: any;
    service.listar().subscribe((turmas) => (resultado = turmas));

    const req = httpMock.expectOne(`${environment.apiUrl}/turmas/Listar`);
    req.flush([
      {
        id: 2,
        periodo: 'TARDE',
        horaInicio: [8, 0, 0],
        horaFim: [12, 30, 0],
        unidade: { id: 1, nome: 'Sede' },
      },
    ]);

    expect(resultado[0].horaInicio).toBe('08:00');
    expect(resultado[0].horaFim).toBe('12:30');
  });
});
