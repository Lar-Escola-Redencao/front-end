import Swal from 'sweetalert2';

export const Alertas = {
  confirmarDescarte: (): Promise<boolean> => {
    return Swal.fire({
      title: 'Descartar alterações?',
      text: 'Existem dados preenchidos que ainda não foram salvos. Deseja realmente sair?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, descartar',
      cancelButtonText: 'Continuar editando',
      confirmButtonColor: '#e04b3a',
      cancelButtonColor: '#757575',
      reverseButtons: true
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
      cancelButtonColor: '#757575',
      reverseButtons: true
    }).then((resultado) => resultado.isConfirmed);
  }
};