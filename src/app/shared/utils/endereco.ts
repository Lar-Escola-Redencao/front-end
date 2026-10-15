export function separarEndereco(endereco: string | null | undefined): {
  endereco: string;
  numeroEndereco: string;
  complementoEndereco: string;
} {
  const texto = endereco || '';
  const partes = texto.match(/^(.*),\s*(\d+[\w/-]*|s\/n)(?:,\s*(.*))?$/i);
  return {
    endereco: partes ? partes[1].trim() : texto,
    numeroEndereco: partes ? partes[2].trim() : '',
    complementoEndereco: partes?.[3]?.trim() || ''
  };
}

export function montarEndereco(endereco: string, numero: string, complemento: string): string {
  return [endereco, numero, complemento]
    .map(parte => (parte || '').trim())
    .filter(Boolean)
    .join(', ');
}
