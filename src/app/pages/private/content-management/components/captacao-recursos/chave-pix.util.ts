import { AbstractControl, ValidatorFn } from '@angular/forms';
import { formatarCpf, formatarTelefone } from 'src/app/shared/utils/masks';

export type TipoChavePix = 'email' | 'cpf' | 'cnpj' | 'telefone' | 'aleatoria';

export function identificarTipoChavePix(valor: string): TipoChavePix {
  if (valor.includes('@')) return 'email';
  if (valor.startsWith('+')) return 'telefone';
  if (/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(valor)) return 'aleatoria';
  const documento = valor.replace(/[.\/-]/g, '');
  if (/^\d{11}$/.test(documento)) return 'cpf';
  if (/^[A-Z\d]{12}\d{2}$/i.test(documento)) return 'cnpj';
  return 'aleatoria';
}

export function formatarChavePix(valor: string, tipo: TipoChavePix): string {
  switch (tipo) {
    case 'email':
      return valor.replace(/\s/g, '').toLowerCase().slice(0, 77);
    case 'aleatoria':
      return valor;
    case 'cpf':
      return formatarCpf(valor);
    case 'cnpj':
      return formatarCnpj(valor);
    case 'telefone':
      return formatarTelefonePix(valor);
  }
}

function formatarCnpj(valor: string): string {
  return valor.toUpperCase().replace(/[^A-Z\d]/g, '').slice(0, 14)
      .replace(/^(.{2})(.)/, '$1.$2')
      .replace(/^(.{2})\.(.{3})(.)/, '$1.$2.$3')
      .replace(/^(..\....\....)(.)/, '$1/$2')
      .replace(/^(..\....\....\/....)(.)/, '$1-$2');
}

function formatarTelefonePix(valor: string): string {
  const digitos = valor.replace(/\D/g, '');
  const telefoneInternacional = valor.startsWith('+') && !digitos.startsWith('55');
  if (telefoneInternacional) {
    return '+' + digitos.slice(0, 15);
  }
  const nacional = digitos.startsWith('55') ? digitos.slice(2) : digitos;
  return '+55 ' + formatarTelefone(nacional);
}

export function validarTipoChavePix(tipo: () => TipoChavePix): ValidatorFn {
  return (controle: AbstractControl) => {
    const valor = String(controle.value ?? '').trim();
    if (!valor) return null;
    const valido = chaveCompativelComTipo(valor, tipo());
    return valido ? null : { custom: 'Informe uma chave válida para o tipo selecionado.' };
  };
}

function chaveCompativelComTipo(valor: string, tipo: TipoChavePix): boolean {
  const semMascara = valor.replace(/[.\/()\s-]/g, '');
  switch (tipo) {
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)
        && /^[\x21-\x7e]+$/.test(valor) && valor.length <= 77;
    case 'cpf':
      return /^\d{11}$/.test(semMascara);
    case 'cnpj':
      return /^[A-Z\d]{12}\d{2}$/.test(semMascara);
    case 'telefone': {
      const formatoInternacionalValido = /^\+[1-9]\d{1,14}$/.test(semMascara);
      const tamanhoBrasileiroValido = !semMascara.startsWith('+55') || /^\+55\d{10,11}$/.test(semMascara);
      return formatoInternacionalValido && tamanhoBrasileiroValido;
    }
    case 'aleatoria':
      return /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(valor);
  }
}
