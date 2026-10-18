import { describe, expect, it } from 'vitest';
import { UsuarioResponseDTO } from 'src/app/shared/models/usuario.model';
import { montarBaseAtualizacaoUsuario } from './usuario-atualizacao-dto';

const usuario: UsuarioResponseDTO = {
  id: 1,
  nomeCompleto: 'Usuário de teste',
  dataNascimento: '2015-05-10',
  documentoAuxiliar: 'CERTIDAO-123',
  tipoDocumento: 'CERTIDAO_NASCIMENTO',
  endereco: 'Rua de teste',
  bairro: 'Centro',
  escola: 'Escola de teste',
  periodoEscolar: 'MANHA',
  serieEscolar: 'SERIE_4',
  idTurma: 1,
  contatos: [{ id: 1, nomeCompleto: 'Responsável', telefone: '16999991111', principal: true }]
};

describe('Documento na atualização do usuário', () => {
  it('limpa o documento alternativo ao mudar para CPF', () => {
    const dto = montarBaseAtualizacaoUsuario(usuario, {
      cpf: '529.982.247-25', documentoAuxiliar: null, tipoDocumento: null
    });
    expect(dto.cpf).toBe('52998224725');
    expect(dto.documentoAuxiliar).toBeNull();
    expect(dto.tipoDocumento).toBeNull();
  });

  it('preserva os documentos ao salvar outra aba sem alterar esses campos', () => {
    const dto = montarBaseAtualizacaoUsuario(usuario);
    expect(dto.documentoAuxiliar).toBe('CERTIDAO-123');
    expect(dto.tipoDocumento).toBe('CERTIDAO_NASCIMENTO');
  });

  it('limpa o CPF ao mudar para documento alternativo', () => {
    const dto = montarBaseAtualizacaoUsuario({ ...usuario, cpf: '52998224725' }, {
      cpf: null, documentoAuxiliar: 'NOVO-123', tipoDocumento: 'OUTRO'
    });
    expect(dto.cpf).toBeNull();
    expect(dto.documentoAuxiliar).toBe('NOVO-123');
  });

  it('não recupera o documento antigo se todos forem explicitamente limpos', () => {
    expect(() => montarBaseAtualizacaoUsuario(usuario, {
      cpf: null, documentoAuxiliar: null, tipoDocumento: null
    })).toThrow('Informe o CPF/CIN ou um documento auxiliar.');
  });
});
