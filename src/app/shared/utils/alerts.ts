import Swal from 'sweetalert2';

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const TEXTO_DESATIVAR_COLABORADOR = 'inativar-colaborador';
const TEXTO_REATIVAR_COLABORADOR = 'ativar-colaborador';

function confirmarComTexto(opcoes: {
  titulo: string;
  htmlMensagem: string;
  textoConfirmacao: string;
  botaoConfirmar: string;
  corConfirmar: string;
  icone: 'warning' | 'question';
}): Promise<boolean> {
  return Swal.fire({
    title: opcoes.titulo,
    html: `${opcoes.htmlMensagem}<br><br>Digite <em>"${opcoes.textoConfirmacao}"</em> para confirmar.`,
    icon: opcoes.icone,
    input: 'text',
    inputPlaceholder: opcoes.textoConfirmacao,
    showCancelButton: true,
    confirmButtonText: opcoes.botaoConfirmar,
    cancelButtonText: 'Cancelar',
    confirmButtonColor: opcoes.corConfirmar,
    reverseButtons: false,
    inputValidator: valor => valor?.trim().toLowerCase() === opcoes.textoConfirmacao
      ? undefined
      : `Digite exatamente: ${opcoes.textoConfirmacao}`
  }).then(resultado => resultado.isConfirmed);
}

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

  confirmarDesativacaoColaborador: (nome: string): Promise<boolean> => {
    return confirmarComTexto({
      titulo: 'Desativar acesso?',
      htmlMensagem: `O acesso de <strong>${escaparHtml(nome)}</strong> será bloqueado, inclusive nas sessões abertas. `
        + 'Os dados e a autoria dos registros serão preservados, e o acesso poderá ser reativado depois.',
      textoConfirmacao: TEXTO_DESATIVAR_COLABORADOR,
      botaoConfirmar: 'Desativar acesso',
      corConfirmar: '#e04b3a',
      icone: 'warning'
    });
  },

  confirmarReativacaoColaborador: (nome: string): Promise<boolean> => {
    return confirmarComTexto({
      titulo: 'Reativar acesso?',
      htmlMensagem: `Deseja continuar com a reativação de <strong>${escaparHtml(nome)}</strong>? `
        + 'Na próxima etapa você poderá revisar os dados e definir uma nova senha.',
      textoConfirmacao: TEXTO_REATIVAR_COLABORADOR,
      botaoConfirmar: 'Continuar reativação',
      corConfirmar: '#3682dc',
      icone: 'question'
    });
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
