import { FormBuilder } from '@angular/forms';

import { PAGINAS_SECOES_CONFIG } from './paginas-secoes.config';
import { criarFormularioGrupo, extrairErrosApi, montarDtoGrupo } from './paginas-secoes.util';

const grupoPorNome = (nome: string) =>
  PAGINAS_SECOES_CONFIG.flatMap((pagina) => pagina.grupos).find((grupo) => grupo.grupo === nome)!;

describe('paginas-secoes.util', () => {
  const fb = new FormBuilder();

  it('maps Telefone to titulo/conteudo with digits only and a fixed grupo', () => {
    const grupo = grupoPorNome('telefone');
    const form = criarFormularioGrupo(fb, grupo);
    form.setValue({ titulo: '(11) 98765-4321', conteudo: '' });

    expect(montarDtoGrupo(grupo, form, null)).toEqual({
      grupo: 'telefone',
      titulo: '11987654321',
      conteudo: '',
    });
  });

  it('maps Produtos to titulo + imagem, without conteudo', () => {
    const grupo = grupoPorNome('produtos');
    const form = criarFormularioGrupo(fb, grupo);
    form.patchValue({ titulo: '  Caneca  ' });
    const arquivo = new File(['x'], 'caneca.png', { type: 'image/png' });

    expect(montarDtoGrupo(grupo, form, arquivo)).toEqual({
      grupo: 'produtos',
      titulo: 'Caneca',
      imagem: arquivo,
    });
  });

  it('maps Pix to conteudo + imagem, without titulo', () => {
    const grupo = grupoPorNome('pix');
    const form = criarFormularioGrupo(fb, grupo);
    form.patchValue({ conteudo: 'chave@lar.org' });

    const dto = montarDtoGrupo(grupo, form, null);

    expect(dto).toEqual({ grupo: 'pix', conteudo: 'chave@lar.org' });
    expect('titulo' in dto).toBe(false);
  });

  it('rejects a blank Pix key', () => {
    const form = criarFormularioGrupo(fb, grupoPorNome('pix'));
    form.patchValue({ conteudo: '   ' });

    expect(form.get('conteudo')?.hasError('required')).toBe(true);
  });

  it('rejects an incomplete WhatsApp number', () => {
    const form = criarFormularioGrupo(fb, grupoPorNome('telefone'));
    form.patchValue({ titulo: '(11) 9876' });

    expect(form.get('titulo')?.hasError('telefoneInvalido')).toBe(true);
  });

  it('rejects a product name shorter than the back-end minimum', () => {
    const form = criarFormularioGrupo(fb, grupoPorNome('produtos'));
    form.patchValue({ titulo: 'ab' });

    expect(form.get('titulo')?.hasError('minlength')).toBe(true);
  });

  it('shows @Valid errors on the fields without repeating them in a toast', () => {
    const erro = {
      status: 400,
      error: {
        titulo: 'tamanho deve ser entre 3 e 150',
        message: 'tamanho deve ser entre 3 e 150',
      },
    };

    expect(extrairErrosApi(erro, grupoPorNome('produtos'))).toEqual({
      erros: { titulo: 'tamanho deve ser entre 3 e 150' },
      mensagem: null,
    });
  });

  it('turns business-rule errors into a general message', () => {
    const erro = {
      status: 400,
      error: {
        message: "O campo 'imagem' é obrigatório para o grupo 'produtos'.",
        status: '400 BAD_REQUEST',
      },
    };

    expect(extrairErrosApi(erro, grupoPorNome('produtos'))).toEqual({
      erros: {},
      mensagem: "O campo 'imagem' é obrigatório para o grupo 'produtos'.",
    });
  });
});
