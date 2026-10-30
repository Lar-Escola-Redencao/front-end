import Swal from 'sweetalert2';

export const Alertas = {
  confirmarAlteracaoIdentificadores: (): Promise<boolean> => {
    return Swal.fire({
      title: 'Alterar dados de acesso?',
      text: 'Ao alterar seu CPF ou e-mail, você será desconectado após salvar e precisará entrar novamente com os dados atualizados.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Salvar e sair',
      cancelButtonText: 'Continuar editando',
      reverseButtons: false
    }).then(resultado => resultado.isConfirmed);
  },
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

  confirmarExclusao: (mensagem = 'Esta ação não poderá ser desfeita.', classePopup = ''): Promise<boolean> => {
    return Swal.fire({
      title: 'Tem certeza?',
      customClass: { popup: classePopup },
      text: mensagem,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e04b3a',
      reverseButtons: false
    }).then((resultado) => resultado.isConfirmed);
  },

  confirmarCancelamentoPix: (): Promise<boolean> => {
    return Swal.fire({
      title: 'Cancelar este Pix?',
      customClass: { popup: 'pix-alerta-acoes' },
      text: 'O código será removido deste navegador. Um código já copiado ainda pode ser aceito pelo banco.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, cancelar Pix',
      cancelButtonText: 'Continuar doação',
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
      denyButtonColor: '#757575',
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
