import '@angular/compiler';

import { FormBuilder } from '@angular/forms';

import { CAPTACAO_RECURSOS_CONFIG } from './captacao-recursos.config';
import {
  criarFormularioGrupo,
  extrairErrosApi,
  montarDtoGrupo,
  valoresIniciaisGrupo,
} from './captacao-recursos.util';

const grupoPorNome = (nome: string) =>
  CAPTACAO_RECURSOS_CONFIG.flatMap((pagina) => pagina.grupos).find((grupo) => grupo.grupo === nome)!;

describe('captacao-recursos.util', () => {
  const fb = new FormBuilder();

  it('shows Produtos e serviços before Contato on the Grafica page', () => {
    const grafica = CAPTACAO_RECURSOS_CONFIG.find((pagina) => pagina.secao === 'grafica')!;

    expect(grafica.grupos.map((grupo) => grupo.rotuloAba)).toEqual(['Produtos e serviços', 'Contato']);
  });

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

  it('keeps secondary phone contact masked when building the DTO', () => {
    const grupo = grupoPorNome('telefone');
    const form = criarFormularioGrupo(fb, grupo);
    form.setValue({ titulo: '(11) 98765-4321', conteudo: '(22) 22222-2222' });

    expect(montarDtoGrupo(grupo, form, null)).toEqual({
      grupo: 'telefone',
      titulo: '11987654321',
      conteudo: '(22) 22222-2222',
    });
  });

  it('formats saved secondary phone contact when filling the form', () => {
    const grupo = grupoPorNome('telefone');

    expect(
      valoresIniciaisGrupo(grupo, {
        id: 4,
        grupo: 'telefone',
        titulo: '11111111111',
        conteudo: '22222222222',
        imagem: null,
        ativo: true,
      }),
    ).toEqual({
      titulo: '(11) 11111-1111',
      conteudo: '(22) 22222-2222',
    });
  });

  it('configures secondary contact as phone or email', () => {
    const grupo = grupoPorNome('telefone');
    const campoSecundario = grupo.campos.find((campo) => campo.campo === 'conteudo')!;

    expect(campoSecundario.rotulo).toBe('Contato secundário (Telefone ou E-mail)');
    expect(campoSecundario.tipo).toBe('telefoneOuEmail');
  });

  it('accepts email as secondary contact and sends it unchanged', () => {
    const grupo = grupoPorNome('telefone');
    const form = criarFormularioGrupo(fb, grupo);
    form.setValue({ titulo: '(11) 98765-4321', conteudo: 'contato@lar.org' });

    expect(form.get('conteudo')?.valid).toBe(true);
    expect(montarDtoGrupo(grupo, form, null)).toEqual({
      grupo: 'telefone',
      titulo: '11987654321',
      conteudo: 'contato@lar.org',
    });
  });

  it('rejects invalid secondary contact when it looks like email', () => {
    const form = criarFormularioGrupo(fb, grupoPorNome('telefone'));
    form.patchValue({ conteudo: 'contato@lar' });

    expect(form.get('conteudo')?.hasError('email')).toBe(true);
  });

  it('maps Produtos to titulo + imagem + ativo, without conteudo', () => {
    const grupo = grupoPorNome('produtos');
    const form = criarFormularioGrupo(fb, grupo);
    form.patchValue({ titulo: '  Caneca  ' });
    const arquivo = new File(['x'], 'caneca.png', { type: 'image/png' });

    expect(montarDtoGrupo(grupo, form, arquivo)).toEqual({
      grupo: 'produtos',
      titulo: 'Caneca',
      imagem: arquivo,
      ativo: true,
    });
  });

  it('keeps product ativo flag when building the DTO', () => {
    const grupo = grupoPorNome('produtos');
    const form = criarFormularioGrupo(fb, grupo);
    form.patchValue({ titulo: 'Caneca', ativo: false });

    expect(montarDtoGrupo(grupo, form, null)).toEqual({
      grupo: 'produtos',
      titulo: 'Caneca',
      ativo: false,
    });
  });

  it.each([true, false])('maps Pix receiver to titulo and key to conteudo with ativo=%s', (ativo) => {
    const grupo = grupoPorNome('pix');
    const form = criarFormularioGrupo(fb, grupo);
    form.patchValue({ titulo: 'Lar Escola Redenção', conteudo: 'chave@lar.org', ativo });

    const dto = montarDtoGrupo(grupo, form, null);

    expect(dto).toEqual({ grupo: 'pix', titulo: 'Lar Escola Redenção', conteudo: 'chave@lar.org', ativo });
  });

  it('requires a receiver name and limits it to 25 characters', () => {
    const form = criarFormularioGrupo(fb, grupoPorNome('pix'));
    expect(form.get('titulo')?.hasError('required')).toBe(true);
    form.patchValue({ titulo: 'A'.repeat(26) });
    expect(form.get('titulo')?.hasError('maxlength')).toBe(true);
    form.patchValue({ titulo: 'Lar Escola Redenção' });
    expect(form.get('titulo')?.valid).toBe(true);
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
