import { CadastroUsuarioCompletoDTO, FichaSocioeconomicaDTO, UsuarioResponseDTO } from 'src/app/shared/models/usuario.model';

type BaseUsuarioAtualizacao = Omit<CadastroUsuarioCompletoDTO, 'composicaoFamiliar' | 'fichaSocioeconomica'>;

export function montarBaseAtualizacaoUsuario(
  usuario: UsuarioResponseDTO,
  dados: Partial<BaseUsuarioAtualizacao> = {}
): BaseUsuarioAtualizacao {
  const cpf = limparNumeros(dados.cpf ?? usuario.cpf);
  const documentoAuxiliar = valorOuNull(dados.documentoAuxiliar ?? usuario.documentoAuxiliar);
  const tipoDocumento = valorOuNull(dados.tipoDocumento ?? usuario.tipoDocumento);
  const contatos = usuario.contatos ?? [];

  if (!cpf && (!documentoAuxiliar || !tipoDocumento)) {
    throw new Error('Informe o CPF/CIN ou um documento auxiliar.');
  }

  if (contatos.length < 1 || contatos.length > 4) {
    throw new Error('O usuario precisa ter entre 1 e 4 contatos para salvar alteracoes.');
  }

  if (contatos.filter(contato => !!contato.principal).length !== 1) {
    throw new Error('O usuario precisa ter exatamente um contato principal para salvar alteracoes.');
  }

  return {
    nomeCompleto: obrigatorio(dados.nomeCompleto ?? usuario.nomeCompleto, 'nome completo'),
    dataNascimento: obrigatorio(dados.dataNascimento ?? usuario.dataNascimento, 'data de nascimento').split('T')[0],
    cpf: cpf || null,
    documentoAuxiliar,
    tipoDocumento,
    cadUnico: dados.cadUnico ?? usuario.cadUnico ?? '',
    cep: limparNumeros(dados.cep ?? usuario.cep) || '',
    bairro: obrigatorio(dados.bairro ?? usuario.bairro, 'bairro'),
    endereco: obrigatorio(dados.endereco ?? usuario.endereco, 'endereco'),
    escola: obrigatorio(dados.escola ?? usuario.escola, 'escola'),
    periodoEscolar: obrigatorio(dados.periodoEscolar ?? usuario.periodoEscolar, 'periodo escolar'),
    serieEscolar: obrigatorio(dados.serieEscolar ?? usuario.serieEscolar, 'serie escolar'),
    raEscolar: dados.raEscolar ?? usuario.raEscolar ?? '',
    idTurma: usuario.idTurma ?? erroObrigatorio('turma'),
    contatos: contatos.map(contato => ({
      id: contato.id,
      nomeCompleto: obrigatorio(contato.nomeCompleto, 'nome do contato'),
      telefone: obrigatorio(limparNumeros(contato.telefone), 'telefone do contato'),
      email: contato.email,
      endereco: contato.endereco,
      cpf: limparNumeros(contato.cpf) || undefined,
      localTrabalho: contato.localTrabalho,
      parentesco: contato.parentesco || 'OUTRO',
      principal: !!contato.principal
    }))
  };
}

export function montarFichaSocioeconomicaBase(usuario: UsuarioResponseDTO): FichaSocioeconomicaDTO {
  return usuario.fichaSocioeconomica ?? { tipoMoradia: 'OUTRO' };
}

function obrigatorio(valor: unknown, campo: string): string {
  const texto = String(valor ?? '').trim();
  if (!texto) erroObrigatorio(campo);
  return texto;
}

function erroObrigatorio(campo: string): never {
  throw new Error(`Nao foi possivel salvar: ${campo} nao informado no cadastro atual.`);
}

function limparNumeros(valor?: string | null): string {
  return valor?.replace(/\D/g, '') ?? '';
}

function valorOuNull(valor?: string | null): string | null {
  const texto = String(valor ?? '').trim();
  return texto || null;
}
