import { FiltrosEventosComponent } from './filtros-eventos';
import { TipoEvento } from 'src/app/shared/models/evento.model';

describe('FiltrosEventosComponent', () => {
  it('edita rascunho sem alterar filtros aplicados e emite ao confirmar', () => {
    const component = new FiltrosEventosComponent();
    const recebidos: unknown[] = [];
    component.aplicar.subscribe(filtros => recebidos.push(filtros));
    component.abrir();
    component.rascunho.tipo = TipoEvento.CULTURAL;
    expect(component.filtros.tipo).toBeNull();
    expect(recebidos).toEqual([]);
    component.confirmar();
    expect(recebidos).toEqual([{ dataInicial: '', dataFinal: '', valor: 'todos', tipo: TipoEvento.CULTURAL }]);
    expect(component.aberto).toBe(false);
  });

  it('permite mesmo dia e impede intervalo invertido', () => {
    const component = new FiltrosEventosComponent();
    const recebidos: unknown[] = [];
    component.aplicar.subscribe(filtros => recebidos.push(filtros));
    component.abrir();
    component.rascunho.dataInicial = '2026-10-15';
    component.rascunho.dataFinal = '2026-10-15';
    expect(component.intervaloInvalido).toBe(false);
    component.rascunho.dataFinal = '2026-10-14';
    component.confirmar();
    expect(recebidos).toEqual([]);
    expect(component.aberto).toBe(true);
  });
});
