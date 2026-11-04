import Swal from 'sweetalert2';
import { vi } from 'vitest';
import { Alertas } from './alerts';

describe('Ordem das ações nos SweetAlerts', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  });

  afterEach(() => {
    Swal.close();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function botoesVisiveis(): string[] {
    return Array.from(Swal.getActions()!.children)
      .filter((elemento): elemento is HTMLButtonElement =>
        elemento instanceof HTMLButtonElement && elemento.style.display !== 'none')
      .map(botao => botao.textContent!.trim());
  }

  it.each([
    { abrir: () => Alertas.confirmarDescarte(), esquerda: 'Sim, descartar', direita: 'Continuar editando' },
    { abrir: () => Alertas.confirmarExclusao(), esquerda: 'Sim, excluir', direita: 'Cancelar' },
    { abrir: () => Alertas.confirmarSubstituirContatoPrincipal(), esquerda: 'Sim, substituir', direita: 'Cancelar' },
    { abrir: () => Alertas.confirmarSaidaFiltros(), esquerda: 'Descartar alterações', direita: 'Voltar aos filtros' }
  ])('exibe "$esquerda" à esquerda e "$direita" à direita', ({ abrir, esquerda, direita }) => {
    void abrir();
    expect(botoesVisiveis()).toEqual([esquerda, direita]);
  });

  it('cancela exclusão pelo botão da direita e confirma pelo da esquerda', async () => {
    const cancelar = Alertas.confirmarExclusao();
    Swal.getCancelButton()!.click();
    expect(await cancelar).toBe(false);

    const confirmar = Alertas.confirmarExclusao();
    Swal.getConfirmButton()!.click();
    expect(await confirmar).toBe(true);
  });

  it('mantém a escolha de voltar aos filtros e de descartar os filtros', async () => {
    const voltar = Alertas.confirmarSaidaFiltros();
    Swal.getConfirmButton()!.click();
    expect(await voltar).toBe('voltar');

    const descartar = Alertas.confirmarSaidaFiltros();
    expect(Swal.getDenyButton()!.style.getPropertyValue('--swal2-deny-button-background-color')).toBe('#e04b3a');
    Swal.getDenyButton()!.click();
    expect(await descartar).toBe('descartar');
  });
});
