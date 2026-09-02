export type Periodo = 'MANHA' | 'TARDE' | 'NOITE';

// O Jackson pode serializar LocalTime como "HH:mm:ss" ou, sem o
// módulo jsr310 configurado para strings, como um array [hora, minuto, segundo].
export type HoraBackend = string | number[];

export interface UnidadeResumo {
  id: number;
  nome: string;
}

export interface Turma {
  id: number;
  periodo: Periodo;
  horaInicio: string;
  horaFim: string;
  unidade: UnidadeResumo;
}

export interface CriarTurmaDTO {
  periodo: Periodo;
  horaInicio: string;
  horaFim: string;
  unidadeId: number;
}

export interface AtualizarTurmaDTO extends CriarTurmaDTO {}
