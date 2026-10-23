import Swal from 'sweetalert2';

export const Alertas = {
  confirmarDescarte: (mensagem = 'Existem dados preenchidos que ainda não foram salvos. Deseja realmente sair?'): Promise<boolean> => {
    return Swal.fire({
      title: 'Descartar alterações?',
      text: mensagem,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, descartar',
      cancelButtonText: 'Continuar editando',
      confirmButtonColor: '#e04b3a',
      reverseButtons: false
    }).then((resultado) => resultado.isConfirmed);
  },

  confirmarExclusao: (mensagem = 'Esta ação não poderá ser desfeita.'): Promise<boolean> => {
    return Swal.fire({
      title: 'Tem certeza?',
      text: mensagem,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e04b3a',
      reverseButtons: false
    }).then((resultado) => resultado.isConfirmed);
  },

  confirmarSaidaFiltros: (): Promise<'descartar' | 'voltar'> => {
    return Swal.fire({
      title: 'Deseja descartar as alterações?',
      text: 'Existem filtros selecionados que ainda não foram aplicados.',
      icon: 'warning',
      showDenyButton: true,
      confirmButtonText: 'Voltar aos filtros',
      denyButtonText: 'Descartar alterações',
      customClass: { confirmButton: 'swal2-retornar' },
      denyButtonColor: '#e04b3a',
      // Neste alerta, confirm volta aos filtros e deny efetiva o descarte.
      reverseButtons: true,
      allowOutsideClick: false,
      allowEscapeKey: false
    }).then((resultado) => {
      if (resultado.isConfirmed) {
        return 'voltar';
      }

      return 'descartar';
    });
  },

  confirmarSubstituirContatoPrincipal: (): Promise<boolean> => {
    return Swal.fire({
      title: 'Substituir contato principal?',
      text: 'Este usuário já possui um contato principal. Deseja substituir pelo contato atual?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, substituir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3682dc',
      reverseButtons: false
    }).then((resultado) => resultado.isConfirmed);
  }
};
