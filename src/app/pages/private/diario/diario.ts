import { Component, OnInit, OnDestroy, inject, NgZone, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, combineLatest, debounceTime, filter, switchMap, tap, startWith } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { UnidadeService } from 'src/app/shared/services/unidade/unidade.service';
import { TurmaService } from 'src/app/shared/services/turma/turma.service';
import { SessaoService } from 'src/app/shared/services/auth/sessao.service';
import { DiarioService, FrequenciaUsuarioResponseDTO, OcorrenciaResponseDTO } from 'src/app/shared/services/diario/diario.service';
import { ModalLayout } from '@components/modal-layout/modal-layout';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { Alertas } from 'src/app/shared/utils/alerts';
import { mapearErrosFormulario } from 'src/app/shared/utils/form-validations';
import { ComponentComAlteracoesNaoSalvas } from 'src/app/shared/guards/can-deactivate.guard';

@Component({
  selector: 'app-diario',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, ModalLayout,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule
  ],
  templateUrl: './diario.html',
  styleUrl: './diario.css'
})
export class Diario implements OnInit, OnDestroy, ComponentComAlteracoesNaoSalvas {
  private fb = inject(FormBuilder);
  private unidadeService = inject(UnidadeService);
  private turmaService = inject(TurmaService);
  private diarioService = inject(DiarioService);
  private sessao = inject(SessaoService);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  filtroForm: FormGroup = this.fb.group({
    idUnidade: [null, Validators.required],
    idTurma: [{ value: null, disabled: true }, Validators.required],
    data: [this.hojeFormatada(), Validators.required]
  });

  unidades: any[] = [];
  turmas: any[] = [];
  usuarios: FrequenciaUsuarioResponseDTO[] = [];
  
  estadoTela: 'VAZIO' | 'INICIAL' | 'PREENCHENDO' | 'SALVO' = 'VAZIO';
  carregando = false;
  salvando = false;
  declaracaoAceita = false;

  private subs: Subscription = new Subscription();

  modalOcorrenciaAberto = false;
  modoOcorrencia: 'LISTA' | 'NOVO' | 'EDITAR' | 'VER' = 'LISTA';
  modalTremendo = false;
  usuarioSelecionado: FrequenciaUsuarioResponseDTO | null = null;
  ocorrenciaSelecionada: OcorrenciaResponseDTO | null = null;
  
  formOcorrencia: FormGroup = this.fb.group({
    horaStr: ['', Validators.required],
    tipoOcorrencia: ['COMPORTAMENTO', Validators.required],
    descricao: ['', Validators.required]
  });
  errosOcorrencia: { [key: string]: string } = {};

  tiposOcorrencia = [
    { value: 'COMPORTAMENTO', label: 'Comportamento' },
    { value: 'SAUDE', label: 'Saúde' },
    { value: 'ASSISTENCIA', label: 'Assistência' },
    { value: 'OUTRO', label: 'Outro' }
  ];

  ngOnInit(): void {
    this.sessao.carregar().subscribe(() => {
      this.carregarUnidades();
      this.cdr.detectChanges();
    });

    this.subs.add(
      this.filtroForm.get('idUnidade')?.valueChanges.subscribe(id => {
        this.filtroForm.get('idTurma')?.setValue(null);
        if (id) {
          this.turmaService.listar(id).subscribe(turmas => {
            this.turmas = turmas.filter(t => t.unidade.id === id);
            this.filtroForm.get('idTurma')?.enable();
          });
        } else {
          this.turmas = [];
          this.filtroForm.get('idTurma')?.disable();
        }
      })
    );

    this.subs.add(
      combineLatest([
        this.filtroForm.get('idTurma')!.valueChanges,
        this.filtroForm.get('data')!.valueChanges.pipe(startWith(this.filtroForm.get('data')!.value))
      ]).pipe(
        debounceTime(300),
        tap(() => {
          this.carregando = true;
          this.usuarios = [];
          this.estadoTela = 'VAZIO';
          this.declaracaoAceita = false;
        }),
        filter(([idTurma, data]) => !!idTurma && !!data),
        switchMap(([idTurma, data]) => {
          this.cdr.detectChanges();
          return this.diarioService.listarFrequencia(idTurma, data);
        })
      ).subscribe({
        next: (dados) => {
          this.ngZone.run(() => {
            this.usuarios = dados;
            const jaPreenchido = this.usuarios.some(u => u.idFrequencia !== null);
            this.estadoTela = jaPreenchido ? 'SALVO' : 'INICIAL';
            this.carregando = false;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.carregando = false;
          this.toastr.error('Erro ao carregar o diário de turma.');
          this.cdr.detectChanges();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private carregarUnidades() {
    this.unidadeService.listarTodas().subscribe(dados => {
      const permitidas = this.sessao.unidadesPermitidasIds();
      this.unidades = permitidas === null ? dados : dados.filter((u: any) => permitidas.includes(u.id));
    });
  }

  get isMonitor(): boolean {
    return this.sessao.isMonitor();
  }

  get podeIniciarChamada(): boolean {
    const idTurma = this.filtroForm.get('idTurma')?.value;
    const dataSelecionada = this.filtroForm.get('data')?.value;
    if (!idTurma || !dataSelecionada || this.estadoTela !== 'INICIAL') return false;

    const turmaSelecionada = this.turmas.find(t => t.id === idTurma);
    if (!turmaSelecionada) return false;

    const hojeStr = this.hojeFormatada();
    if (dataSelecionada > hojeStr) return false; 
    if (dataSelecionada < hojeStr) return true; 

    const agora = new Date();
    const horaTurmaSplit = turmaSelecionada.horaInicio.split(':');
    const dataHoraTurma = new Date();
    dataHoraTurma.setHours(Number(horaTurmaSplit[0]), Number(horaTurmaSplit[1]), 0, 0);

    return agora >= dataHoraTurma;
  }

  get podeEditarFrequencia(): boolean {
    if (!this.isMonitor) return true;
    const dataSelecionada = new Date(this.filtroForm.get('data')?.value + 'T23:59:59');
    const agora = new Date();
    const diffHoras = (agora.getTime() - dataSelecionada.getTime()) / (1000 * 60 * 60);
    return diffHoras <= 48;
  }

  get podeAdicionarOcorrencia(): boolean {
    if (this.usuarioSelecionado?.statusMatricula === 'EXCLUIDO' || this.usuarioSelecionado?.statusMatricula === 'EGRESSO') return false;
    if (!this.isMonitor) return true;
    const dataSelecionada = new Date(this.filtroForm.get('data')?.value + 'T00:00:00');
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const diffDias = Math.floor((hoje.getTime() - dataSelecionada.getTime()) / (1000 * 60 * 60 * 24));
    return diffDias <= 7;
  }

  podeEditarExcluirOcorrencia(oc: OcorrenciaResponseDTO): boolean {
    if (this.usuarioSelecionado?.statusMatricula === 'EXCLUIDO' || this.usuarioSelecionado?.statusMatricula === 'EGRESSO') return false;
    if (!this.isMonitor) return true;
    const criacao = new Date(oc.dataCriacao);
    const agora = new Date();
    const diffHoras = (agora.getTime() - criacao.getTime()) / (1000 * 60 * 60);
    return diffHoras <= 24;
  }

  alterarData(dias: number) {
    const dataAtual = new Date(this.filtroForm.get('data')?.value + 'T12:00:00');
    dataAtual.setDate(dataAtual.getDate() + dias);
    this.filtroForm.get('data')?.setValue(dataAtual.toISOString().split('T')[0]);
  }

  iniciarChamada() {
    this.estadoTela = 'PREENCHENDO';
    this.usuarios.forEach(u => u.presente = u.statusMatricula === 'EXCLUIDO' ? false : true); 
  }

  editarChamada() {
    this.estadoTela = 'PREENCHENDO';
    this.declaracaoAceita = false;
  }

  cancelarPreenchimento() {
    Alertas.confirmarDescarte().then(confirmado => {
      if (confirmado) {
        this.ngZone.run(() => {
          this.carregando = true;
          this.cdr.detectChanges();
          
          const idTurma = this.filtroForm.get('idTurma')?.value;
          const data = this.filtroForm.get('data')?.value;

          this.diarioService.listarFrequencia(idTurma, data).subscribe({
            next: (dados) => {
              this.ngZone.run(() => {
                this.usuarios = dados;
                const jaPreenchido = this.usuarios.some(u => u.idFrequencia !== null);
                this.estadoTela = jaPreenchido ? 'SALVO' : 'INICIAL';
                this.declaracaoAceita = false;
                this.carregando = false;
                this.cdr.detectChanges();
              });
            },
            error: () => {
              this.ngZone.run(() => {
                this.carregando = false;
                this.toastr.error('Erro ao restaurar a chamada original.');
                this.cdr.detectChanges();
              });
            }
          });
        });
      }
    });
  }

  marcarFrequencia(usuario: FrequenciaUsuarioResponseDTO, presente: boolean) {
    if (!this.podeEditarFrequencia || usuario.statusMatricula === 'EXCLUIDO') return;

    if (this.estadoTela === 'SALVO') {
      if (usuario.idFrequencia) {
        this.diarioService.atualizarFrequencia(usuario.idFrequencia, presente).subscribe({
          next: () => {
             usuario.presente = presente;
             this.toastr.success('Frequência atualizada.');
          },
          error: () => this.toastr.error('Erro ao atualizar frequência.')
        });
      }
    } else {
      usuario.presente = presente;
    }
  }

  salvarDiarioLote() {
    if (!this.declaracaoAceita) return;

    this.salvando = true;
    const dto = {
      idTurma: this.filtroForm.get('idTurma')?.value,
      data: this.filtroForm.get('data')?.value,
      frequencias: this.usuarios
        .filter(u => u.statusMatricula !== 'EXCLUIDO' && u.statusMatricula !== 'EGRESSO')
        .map(u => ({
          idMatricula: u.idMatricula,
          presente: u.presente!
        }))
    };

    this.diarioService.salvarEmLote(dto).subscribe({
      next: () => {
        this.toastr.success('Diário salvo com sucesso!');
        this.salvando = false;
        this.filtroForm.get('data')?.updateValueAndValidity(); 
      },
      error: () => {
        this.toastr.error('Erro ao salvar diário.');
        this.salvando = false;
      }
    });
  }

  get temAlteracoesNoDiario(): boolean {
    return this.estadoTela === 'PREENCHENDO';
  }

  get temAlteracoesNoModalOcorrencia(): boolean {
    if (this.modalOcorrenciaAberto && (this.modoOcorrencia === 'NOVO' || this.modoOcorrencia === 'EDITAR')) {
      return this.formOcorrencia.dirty;
    }
    return false;
  }

  formularioTemAlteracoesNaoSalvas(): boolean {
    return this.temAlteracoesNoDiario || this.temAlteracoesNoModalOcorrencia;
  }

  @HostListener('window:beforeunload', ['$event'])
  avisarAntesDeFechar(event: BeforeUnloadEvent): void {
    if (this.formularioTemAlteracoesNaoSalvas()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  abrirGerenciadorOcorrencias(usuario: FrequenciaUsuarioResponseDTO) {
    this.usuarioSelecionado = usuario;
    if (usuario.ocorrencias && usuario.ocorrencias.length > 0) {
      this.modoOcorrencia = 'LISTA';
    } else {
      this.abrirFormOcorrencia(null, 'NOVO');
    }
    this.modalOcorrenciaAberto = true;
  }

  fecharModalOcorrencia() {
    if (!this.temAlteracoesNoModalOcorrencia) {
      this.executarFechamentoModal();
      return;
    }
    Alertas.confirmarDescarte().then(confirmado => {
      this.ngZone.run(() => {
        if (confirmado) this.executarFechamentoModal();
        else this.dispararTremorModal();
        this.cdr.detectChanges();
      });
    });
  }

  private executarFechamentoModal() {
    this.modalOcorrenciaAberto = false;
    this.usuarioSelecionado = null;
    this.formOcorrencia.enable();
    this.formOcorrencia.markAsPristine();
  }

  voltarParaLista() {
    if (!this.temAlteracoesNoModalOcorrencia) {
      this.executarVoltarParaLista();
      return;
    }
    Alertas.confirmarDescarte().then(confirmado => {
      this.ngZone.run(() => {
        if (confirmado) this.executarVoltarParaLista();
        else this.dispararTremorModal();
        this.cdr.detectChanges();
      });
    });
  }

  private executarVoltarParaLista() {
    if (this.usuarioSelecionado?.ocorrencias.length) {
      this.modoOcorrencia = 'LISTA';
      this.formOcorrencia.markAsPristine();
    } else {
      this.executarFechamentoModal();
    }
  }

  private dispararTremorModal() {
    this.modalTremendo = true;
    setTimeout(() => {
      this.modalTremendo = false;
      this.cdr.detectChanges();
    }, 400);
  }

  abrirFormOcorrencia(oc: OcorrenciaResponseDTO | null, modo: 'NOVO' | 'EDITAR' | 'VER') {
    this.modoOcorrencia = modo;
    this.ocorrenciaSelecionada = oc;
    this.errosOcorrencia = {};
    
    if (modo === 'NOVO') {
      this.formOcorrencia.enable();
      this.formOcorrencia.reset({
        horaStr: this.agoraFormatada(),
        tipoOcorrencia: 'COMPORTAMENTO',
        descricao: ''
      });
    } else if (oc) {
      const hora = new Date(oc.dataCriacao).toTimeString().substring(0, 5); 
      this.formOcorrencia.patchValue({
        horaStr: hora,
        tipoOcorrencia: oc.tipoOcorrencia,
        descricao: oc.descricao
      });
      
      if (modo === 'VER') {
        this.formOcorrencia.disable();
      } else {
        this.formOcorrencia.enable();
      }
    }
    this.formOcorrencia.markAsPristine();
  }

  salvarOcorrencia() {
    if (this.formOcorrencia.invalid) {
      this.errosOcorrencia = mapearErrosFormulario(this.formOcorrencia);
      return;
    }

    this.salvando = true;
    const { tipoOcorrencia, descricao } = this.formOcorrencia.getRawValue();
    const dataSelecionada = this.filtroForm.get('data')?.value;
    
    if (this.modoOcorrencia === 'NOVO') {
      const dto = {
        idMatricula: this.usuarioSelecionado!.idMatricula,
        dataOcorrencia: dataSelecionada,
        tipoOcorrencia,
        descricao
      };

      this.diarioService.criarOcorrencia(dto).subscribe({
        next: (novaOc) => {
          this.ngZone.run(() => {
            this.usuarioSelecionado!.ocorrencias.push(novaOc);
            this.formOcorrencia.markAsPristine();
            this.toastr.success('Ocorrência registrada com sucesso.', 'Sucesso');
            this.salvando = false;
            this.executarVoltarParaLista();
            this.cdr.detectChanges();
          });
        },
        error: () => { 
          this.ngZone.run(() => {
            this.toastr.error('Erro ao registrar ocorrência.'); 
            this.salvando = false; 
            this.cdr.detectChanges();
          });
        }
      });
    } else {
      const dto = { tipoOcorrencia, descricao };
      this.diarioService.atualizarOcorrencia(this.ocorrenciaSelecionada!.id, dto).subscribe({
        next: (ocAtualizada) => {
          this.ngZone.run(() => {
            const idx = this.usuarioSelecionado!.ocorrencias.findIndex(o => o.id === ocAtualizada.id);
            if (idx !== -1) this.usuarioSelecionado!.ocorrencias[idx] = ocAtualizada;
            this.formOcorrencia.markAsPristine();
            this.toastr.success('Ocorrência atualizada com sucesso.', 'Sucesso');
            this.salvando = false;
            this.executarVoltarParaLista();
            this.cdr.detectChanges();
          });
        },
        error: () => { 
          this.ngZone.run(() => {
            this.toastr.error('Erro ao atualizar ocorrência.'); 
            this.salvando = false; 
            this.cdr.detectChanges();
          });
        }
      });
    }
  }

  excluirOcorrencia(oc: OcorrenciaResponseDTO) {
    Alertas.confirmarExclusao().then(confirma => {
      if (!confirma) return;
      
      this.diarioService.deletarOcorrencia(oc.id).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.usuarioSelecionado!.ocorrencias = this.usuarioSelecionado!.ocorrencias.filter(o => o.id !== oc.id);
            this.toastr.success('Ocorrência excluída com sucesso.', 'Sucesso');
            if (this.usuarioSelecionado!.ocorrencias.length === 0) {
              this.executarFechamentoModal();
            }
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.ngZone.run(() => {
             this.toastr.error('Erro ao excluir ocorrência.', 'Erro');
             this.cdr.detectChanges();
          });
        }
      });
    });
  }

  private hojeFormatada(): string {
    const d = new Date();
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private agoraFormatada(): string {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  formatarData(isoStr: string): string {
    const d = new Date(isoStr + 'T12:00:00');
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  }

  formatarDataHora(isoStr: string): string {
    const d = new Date(isoStr);
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d).replace(':', 'h');
  }

  obterLabelOcorrencia(tipo: string): string {
    return this.tiposOcorrencia.find(t => t.value === tipo)?.label || tipo;
  }
}