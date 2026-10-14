import { obterNomeDownload } from './arquivo-acesso';

describe('Nome do download', () => {
  it('prioriza o nome UTF-8 retornado pelo servidor', () => {
    expect(
      obterNomeDownload(
        "attachment; filename*=UTF-8''Balan%C3%A7o.pdf",
        'Outro título',
        '/download',
        ''
      )
    ).toBe('Balanço.pdf');
  });

  it('aceita o filename comum quando o codificado é inválido', () => {
    expect(
      obterNomeDownload(
        'attachment; filename="Balanço.pdf"; filename*=UTF-8\'\'%ZZ',
        'Outro',
        '/download',
        ''
      )
    ).toBe('Balanço.pdf');
  });

  it('usa a extensão do arquivo original quando não há header', () => {
    expect(
      obterNomeDownload(null, 'Balanço', '/uploads/documento.pdf', 'application/octet-stream')
    ).toBe('Balanço.pdf');
    expect(obterNomeDownload(null, 'Balanço.pdf', '/uploads/documento.pdf', '')).toBe(
      'Balanço.pdf'
    );
  });

  it('usa o tipo do arquivo como fallback e remove separadores de caminho', () => {
    expect(obterNomeDownload(null, '../Balanço', '/download', 'application/pdf')).toBe(
      '.._Balanço.pdf'
    );
  });
});
