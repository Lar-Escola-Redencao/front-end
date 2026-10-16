import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { EventoComponent } from './content-management/components/evento/evento.component';
import { DiretoriaComponent } from './content-management/components/diretoria/diretoria.component';
import { PartnersManager } from './content-management/components/parceiro/partners-manager';
import { SocialLinksManager } from './content-management/components/redes-sociais/social-links-manager';
import { Transparencia } from './content-management/components/transparencia/transparencia';
import { Sobre } from './content-management/components/sobre/sobre';
import { CaptacaoRecursos } from './content-management/components/captacao-recursos/captacao-recursos';
import { CAPTACAO_RECURSOS_CONFIG } from './content-management/components/captacao-recursos/captacao-recursos.config';
import { DiretoriaService } from 'src/app/shared/services/content-management/diretoria/diretoria.service';
import { SecoesGrupoService } from 'src/app/shared/services/pagina/secoes-grupo.service';
import { UnidadesTurmas } from './unidades-turmas/unidades-turmas';
import { ColaboradorComponent } from './colaborador/colaborador.component';

interface CasoFormulario {
  nome: string;
  componente: Type<any>;
  abrir: (componente: any, edicao: boolean) => void;
  formulario: string;
  campo: string;
}

const casos: CasoFormulario[] = [
  {
    nome: 'eventos', componente: EventoComponent, formulario: 'formEvento', campo: 'titulo',
    abrir: (c, editar) => editar ? c.abrirEdicao({ id: 1, titulo: 'Evento', descricao: 'Descrição',
      dataEvento: '2026-10-20T10:00:00', endereco: 'Rua A', tipoEvento: 'GRATUITO', valor: 0, parceiros: [] }) : c.abrirCadastro()
  },
  {
    nome: 'diretoria', componente: DiretoriaComponent, formulario: 'formDiretoria', campo: 'nome',
    abrir: (c, editar) => editar ? c.abrirEdicao({ id: 1 }) : c.abrirCadastro()
  },
  {
    nome: 'parceiros', componente: PartnersManager, formulario: 'form', campo: 'nome',
    abrir: (c, editar) => c.abrirModal(editar ? { id: 1, nome: 'Parceiro', ativo: true } : undefined)
  },
  {
    nome: 'redes sociais', componente: SocialLinksManager, formulario: 'form', campo: 'nome',
    abrir: (c, editar) => c.abrirModal(editar ? { id: 1, nome: 'Instagram', url: 'https://instagram.com/osc', ativo: true } : undefined)
  },
  ...(['documento', 'secao'] as const).map(tipo => ({
    nome: `transparência: ${tipo}`, componente: Transparencia,
    formulario: tipo === 'documento' ? 'formDocumento' : 'formSecao', campo: 'titulo',
    abrir: (c: Transparencia, editar: boolean) => c.abrirModal(tipo, editar
      ? { id: 1, titulo: 'Relatório', conteudo: 'Texto', secaoId: 1, ativo: true } : undefined)
  })),
  {
    nome: 'marcos históricos', componente: Sobre, formulario: 'formHistoria', campo: 'conteudo',
    abrir: (c, editar) => c.abrirModalHistoria(editar ? { id: 1, titulo: '2000', conteudo: 'Fundação', ativo: true } : undefined)
  },
  {
    nome: 'unidades', componente: UnidadesTurmas, formulario: 'formUnidade', campo: 'nome',
    abrir: (c, editar) => editar ? c.abrirEdicao({ id: 1, nome: 'Sede', endereco: 'Rua A', telefone: '16999999999',
      email: 'sede@osc.org', diasFuncionamento: 'SEGUNDA', horarioAbertura: '08:00', horarioFechamento: '17:00', idadeMin: 6, idadeMax: 17 }) : c.abrirCadastro()
  },
  {
    nome: 'turmas', componente: UnidadesTurmas, formulario: 'formTurma', campo: 'horaInicio',
    abrir: (c, editar) => editar ? c.abrirEdicaoTurma({ id: 1, periodo: 'MANHA', horaInicio: '08:00', horaFim: '12:00', unidade: { id: 1 } }) : c.abrirCadastroTurma()
  },
  {
    nome: 'colaboradores', componente: ColaboradorComponent, formulario: 'formColaborador', campo: 'nomeCompleto',
    abrir: (c, editar) => editar ? c.abrirEdicao({ id: 1, nomeCompleto: 'Colaborador', email: 'pessoa@osc.org',
      cpf: '52998224725', endereco: 'Rua da Sede', telefone: '16999999999', idPapel: 1, unidades: [] }) : c.abrirCadastro()
  },
  ...CAPTACAO_RECURSOS_CONFIG.map(config => ({
    nome: config.secao, componente: CaptacaoRecursos, formulario: 'form',
    campo: config.secao === 'pix' ? 'conteudo' : 'titulo',
    abrir: (c: CaptacaoRecursos, editar: boolean) => {
      c.config = config;
      c.ngOnInit();
      c.abrirModal(editar ? { id: 1, grupo: config.grupos[0].grupo, titulo: 'Produto', conteudo: 'chave@osc.org', ativo: true, imagem: null } : undefined);
    }
  })),
  {
    nome: 'contato da gráfica', componente: CaptacaoRecursos, formulario: 'form', campo: 'titulo',
    abrir: (c) => {
      const config = CAPTACAO_RECURSOS_CONFIG.find(item => item.secao === 'grafica')!;
      c.config = { ...config, grupos: [config.grupos[1]] };
      c.ngOnInit();
      c.editarContato();
    }
  }
];

describe.each(casos)('Ações de formulário: $nome', caso => {
  afterEach(() => vi.restoreAllMocks());

  function abrir(edicao: boolean) {
    if (caso.componente !== CaptacaoRecursos) {
      vi.spyOn(caso.componente.prototype, 'ngOnInit').mockImplementation(() => {});
    }
    TestBed.configureTestingModule({
      imports: [caso.componente],
      providers: [provideHttpClient(), provideRouter([]),
        { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } },
        { provide: DiretoriaService, useValue: {
          buscarPorId: () => of({ id: 1, nome: 'Diretor', cargo: 'Presidente', ativo: true }), fotoUrl: () => ''
        } },
        { provide: SecoesGrupoService, useValue: { listarPorGrupo: () => of(
          caso.nome === 'contato da gráfica' && edicao
            ? [{ id: 1, grupo: 'telefone', titulo: '16999999999', conteudo: '', imagem: null }] : []
        ) } }
      ]
    });
    const fixture = TestBed.createComponent(caso.componente);
    const componente = fixture.componentInstance;
    // O teste abre o formulário diretamente; a consulta da listagem é independente.
    caso.abrir(componente, edicao);
    fixture.detectChanges();
    const salvar = () => fixture.nativeElement.querySelector('form button[type="submit"]') as HTMLButtonElement;
    return { fixture, componente, salvar };
  }

  it('permite tentar salvar cadastro vazio e exibe a validação', () => {
    const { fixture, componente, salvar } = abrir(false);
    expect(salvar().disabled).toBe(false);
    salvar().click();
    fixture.detectChanges();
    expect(componente[caso.formulario].get(caso.campo).touched).toBe(true);
    expect(fixture.nativeElement.querySelector('.error-text, mat-error')).toBeTruthy();
    expect(salvar().disabled).toBe(false);
  });

  it('bloqueia edição original, libera ao alterar e bloqueia ao desfazer', () => {
    const { fixture, componente, salvar } = abrir(true);
    const campo = componente[caso.formulario].get(caso.campo);
    const original = campo.value;
    expect(salvar().disabled).toBe(true);
    campo.setValue(caso.campo === 'horaInicio' ? '09:00' : 'Valor alterado');
    campo.markAsDirty();
    fixture.detectChanges();
    expect(salvar().disabled).toBe(false);
    campo.setValue(original);
    fixture.detectChanges();
    expect(salvar().disabled).toBe(true);
  });

  if (caso.nome === 'eventos') {
    it('bloqueia salvar após desmarcar e remarcar o mesmo parceiro', () => {
      const { fixture, componente, salvar } = abrir(true);
      componente.abrirEdicao({ id: 1, titulo: 'Evento', parceiros: [{ id: 1 }, { id: 2 }] });
      componente.formEvento.get('parceirosIds').setValue([2]);
      componente.formEvento.get('parceirosIds').setValue([2, 1]);
      fixture.detectChanges();
      expect(salvar().disabled).toBe(true);
    });
  }

  if (caso.nome === 'colaboradores') {
    it('bloqueia salvar após desmarcar e remarcar a mesma unidade', () => {
      const { fixture, componente, salvar } = abrir(true);
      componente.abrirEdicao({ id: 1, nomeCompleto: 'Colaborador', unidades: [{ id: 1 }, { id: 2 }] });
      componente.formColaborador.get('idsUnidades').setValue([2]);
      componente.formColaborador.get('idsUnidades').setValue([2, 1]);
      fixture.detectChanges();
      expect(salvar().disabled).toBe(true);
    });
  }
});
