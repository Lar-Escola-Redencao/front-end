import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { CadastroUsuarioCompletoDTO, ComposicaoFamiliarDTO, UsuarioResponseDTO } from 'src/app/shared/models/usuario.model';
import { UsuarioService } from 'src/app/shared/services/usuario/usuario.service';

@Component({
  selector: 'app-usuario-perfil-dados-socioeconomicos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  templateUrl: './dados-socioeconomicos.html',
  styleUrl: './dados-socioeconomicos.css'
})
export class UsuarioPerfilDadosSocioeconomicos implements OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly usuarioService = inject(UsuarioService);
  private readonly toastr = inject(ToastrService);
  private readonly subs: Subscription[] = [];

  @Input() usuario: UsuarioResponseDTO | null = null;
  @Input() somenteLeitura = false;
  @Output() usuarioAtualizado = new EventEmitter<UsuarioResponseDTO>();

  editando = false;
  salvando = false;
  familiarExpandidoIndex = -1;
  private valoresOriginais: unknown = null;

  readonly tiposMoradia = [
    { value: 'ALUGADA', label: 'Alugada' },
    { value: 'PROPRIA', label: 'Própria' },
    { value: 'APARTAMENTO_ALUGADO', label: 'Apto. alugado' },
    { value: 'APARTAMENTO_PROPRIO', label: 'Apto. próprio' },
    { value: 'OUTRO', label: 'Outro' }
  ];

  readonly escolaridades = [
    { value: 'ANALFABETO', label: 'Analfabeto' },
    { value: 'ALFABETIZADO', label: 'Alfabetizado' },
    { value: 'FUNDAMENTAL_INCOMPLETO', label: 'Fundamental incompleto' },
    { value: 'FUNDAMENTAL_COMPLETO', label: 'Fundamental completo' },
    { value: 'MEDIO_INCOMPLETO', label: 'Médio incompleto' },
    { value: 'MEDIO_COMPLETO', label: 'Médio completo' },
    { value: 'SUPERIOR_INCOMPLETO', label: 'Superior incompleto' },
    { value: 'SUPERIOR_COMPLETO', label: 'Superior completo' },
    { value: 'POS_GRADUACAO', label: 'Pós-graduação' }
  ];

  readonly opcoesParentesco = [
    { label: 'Mãe', value: 'MAE' },
    { label: 'Pai', value: 'PAI' },
    { label: 'Avô/Avó', value: 'AVO' },
    { label: 'Irmão/Irmã', value: 'IRMAO' },
    { label: 'Tio/Tia', value: 'TIO' },
    { label: 'Primo/Prima', value: 'PRIMO' },
    { label: 'Padrasto/Madrasta', value: 'PADRASTO_MADRASTA' },
    { label: 'Vizinho', value: 'VIZINHO' },
    { label: 'Outro', value: 'OUTRO' }
  ];

  readonly despesas = [
    { campo: 'despesaEnergia', label: 'Energia' },
    { campo: 'despesaAgua', label: 'Água' },
    { campo: 'despesaInternet', label: 'Internet' },
    { campo: 'despesaTelefone', label: 'Telefone' },
    { campo: 'despesaMercado', label: 'Mercado' },
    { campo: 'despesaFarmacia', label: 'Farmácia' },
    { campo: 'despesaFinanciamentos', label: 'Financiamentos' },
    { campo: 'despesaOutras', label: 'Outras' }
  ] as const;

  readonly transportes = [
    { campo: 'utilizaCarro', valor: 'gastoCarro', label: 'Carro' },
    { campo: 'utilizaMoto', valor: 'gastoMoto', label: 'Moto' },
    { campo: 'utilizaTransportePublico', valor: 'gastoTransportePublico', label: 'Transporte público' },
    { campo: 'utilizaVan', valor: 'gastoVan', label: 'Van / Transporte particular' },
    { campo: 'andandoOuBicicleta', valor: '', label: 'Caminhando / bicicleta' }
  ] as const;

  readonly religioes = ['Católica', 'Evangélica', 'Espírita', 'Religião de Matriz Africana', 'Sem Religião', 'Outra'];

  form = this.fb.group({
    composicaoFamiliar: this.fb.array([]),
    tipoMoradia: ['', Validators.required],
    valorAluguel: [null as number | null],
    valorFinanciamento: [null as number | null],
    despesaEnergia: [null as number | null],
    despesaAgua: [null as number | null],
    despesaInternet: [null as number | null],
    despesaTelefone: [null as number | null],
    despesaMercado: [null as number | null],
    despesaFarmacia: [null as number | null],
    despesaFinanciamentos: [null as number | null],
    despesaOutras: [null as number | null],
    utilizaCarro: [false],
    gastoCarro: [null as number | null],
    utilizaMoto: [false],
    gastoMoto: [null as number | null],
    utilizaTransportePublico: [false],
    gastoTransportePublico: [null as number | null],
    utilizaVan: [false],
    gastoVan: [null as number | null],
    andandoOuBicicleta: [false],
    professaReligiao: [false],
    religiao: [''],
    outraReligiao: ['']
  });

  constructor() {
    this.registrarValidadores();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['usuario']) this.preencherFormulario();
  }

  ngOnDestroy(): void {
    this.subs.forEach(sub => sub.unsubscribe());
  }

  get familiaresArray(): FormArray {
    return this.form.get('composicaoFamiliar') as FormArray;
  }

  get temAlteracoes(): boolean {
    return JSON.stringify(this.form.getRawValue()) !== JSON.stringify(this.valoresOriginais);
  }

  get totalDespesasMensais(): number {
    return this.despesas.reduce((total, despesa) => total + (Number(this.form.get(despesa.campo)?.value) || 0), 0);
  }

  editar(): void {
    if (this.somenteLeitura) return;
    this.editando = true;
    this.form.enable();
  }

  cancelar(): void {
    this.preencherFormulario();
  }

  salvar(): void {
    if (!this.usuario || this.somenteLeitura) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.temAlteracoes) return;

    this.salvando = true;
    this.usuarioService.atualizar(this.usuario.id, this.montarDtoAtualizacao()).subscribe({
      next: usuarioAtualizado => {
        this.usuario = usuarioAtualizado;
        this.preencherFormulario();
        this.usuarioAtualizado.emit(usuarioAtualizado);
        this.toastr.success('Dados socioeconômicos salvos com sucesso!', 'Sucesso');
      },
      error: (err: any) => {
        this.salvando = false;
        this.toastr.error(err.error?.message || 'Erro ao salvar dados socioeconômicos.', 'Erro');
      }
    });
  }

  adicionarFamiliar(): void {
    const familiar = this.criarFamiliar();
    familiar.markAsPristine();
    familiar.markAsUntouched();
    this.familiaresArray.push(familiar);
    this.familiarExpandidoIndex = this.familiaresArray.length - 1;
  }

  expandirFamiliar(index: number): void {
    this.familiarExpandidoIndex = this.familiarExpandidoIndex === index ? -1 : index;
  }

  removerFamiliar(index: number): void {
    this.familiaresArray.removeAt(index);
    if (this.familiarExpandidoIndex === index) this.familiarExpandidoIndex = -1;
    else if (this.familiarExpandidoIndex > index) this.familiarExpandidoIndex--;
  }

  mensagemErro(campo: any): string {
    if (!campo || !campo.touched || !campo.errors) return '';
    if (campo.errors['required']) return 'Campo obrigatório.';
    if (campo.errors['min']) return 'Valor inválido.';
    return 'Campo inválido.';
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  }

  temValorNumerico(valor: unknown): boolean {
    return valor !== null && valor !== undefined && valor !== '';
  }

  tituloFamiliar(index: number): string {
    const nome = this.familiaresArray.at(index)?.get('nomeCompleto')?.value;
    return nome ? String(nome) : `Membro ${index + 1}`;
  }

  vinculoFamiliar(index: number): string {
    const valor = this.familiaresArray.at(index)?.get('parentescoVinculo')?.value;
    return valor ? this.opcoesParentesco.find(item => item.value === valor)?.label ?? String(valor) : '';
  }

  private registrarValidadores(): void {
    this.subs.push(this.form.get('tipoMoradia')!.valueChanges.subscribe(tipo => {
      const aluguel = this.form.get('valorAluguel')!;
      aluguel.setValidators(tipo === 'ALUGADA' || tipo === 'APARTAMENTO_ALUGADO' ? [Validators.required, Validators.min(0)] : []);
      aluguel.updateValueAndValidity({ emitEvent: false });
    }));
    this.subs.push(this.form.get('professaReligiao')!.valueChanges.subscribe(professa => {
      const religiao = this.form.get('religiao')!;
      religiao.setValidators(professa ? [Validators.required] : []);
      if (!professa) {
        religiao.setValue('', { emitEvent: false });
        this.form.get('outraReligiao')?.setValue('', { emitEvent: false });
      }
      religiao.updateValueAndValidity({ emitEvent: false });
    }));
    this.subs.push(this.form.get('religiao')!.valueChanges.subscribe(tipo => {
      const outra = this.form.get('outraReligiao')!;
      outra.setValidators(tipo === 'Outra' ? [Validators.required] : []);
      outra.updateValueAndValidity({ emitEvent: false });
    }));
    for (const transporte of this.transportes.filter(item => item.valor)) {
      this.subs.push(this.form.get(transporte.campo)!.valueChanges.subscribe(ativo => {
        const controle = this.form.get(transporte.valor)!;
        controle.setValidators(ativo ? [Validators.min(0)] : []);
        if (!ativo) controle.setValue(null, { emitEvent: false });
        controle.updateValueAndValidity({ emitEvent: false });
      }));
    }
  }

  private preencherFormulario(): void {
    const ficha = this.usuario?.fichaSocioeconomica;
    const religiao = ficha?.religiao ?? '';

    this.familiaresArray.clear();
    for (const familiar of this.usuario?.composicaoFamiliar ?? []) {
      this.familiaresArray.push(this.criarFamiliar(familiar));
    }
    this.familiarExpandidoIndex = -1;

    this.form.patchValue({
      tipoMoradia: ficha?.tipoMoradia ?? 'OUTRO',
      valorAluguel: ficha?.valorAluguel ?? null,
      valorFinanciamento: ficha?.valorFinanciamento ?? null,
      despesaEnergia: ficha?.despesaEnergia ?? null,
      despesaAgua: ficha?.despesaAgua ?? null,
      despesaInternet: ficha?.despesaInternet ?? null,
      despesaTelefone: ficha?.despesaTelefone ?? null,
      despesaMercado: ficha?.despesaMercado ?? null,
      despesaFarmacia: ficha?.despesaFarmacia ?? null,
      despesaFinanciamentos: ficha?.despesaFinanciamentos ?? null,
      despesaOutras: ficha?.despesaOutras ?? null,
      utilizaCarro: !!ficha?.utilizaCarro,
      gastoCarro: ficha?.gastoCarro ?? null,
      utilizaMoto: !!ficha?.utilizaMoto,
      gastoMoto: ficha?.gastoMoto ?? null,
      utilizaTransportePublico: !!ficha?.utilizaTransportePublico,
      gastoTransportePublico: ficha?.gastoTransportePublico ?? null,
      utilizaVan: !!ficha?.utilizaVan,
      gastoVan: ficha?.gastoVan ?? null,
      andandoOuBicicleta: !!ficha?.andandoOuBicicleta,
      professaReligiao: !!religiao && religiao !== 'Sem Religião',
      religiao: this.religioes.includes(religiao) ? religiao : religiao ? 'Outra' : '',
      outraReligiao: this.religioes.includes(religiao) ? '' : religiao
    }, { emitEvent: true });

    this.form.disable();
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.familiaresArray.controls.forEach(controle => {
      controle.markAsPristine();
      controle.markAsUntouched();
    });
    this.valoresOriginais = this.form.getRawValue();
    this.editando = false;
    this.salvando = false;
  }

  private criarFamiliar(familiar?: ComposicaoFamiliarDTO) {
    return this.fb.group({
      nomeCompleto: [familiar?.nomeCompleto ?? '', Validators.required],
      idade: [familiar?.idade ?? null],
      parentescoVinculo: [familiar?.parentescoVinculo ?? '', Validators.required],
      escolaridade: [familiar?.escolaridade ?? '', Validators.required],
      renda: [familiar?.renda ?? null],
      beneficios: [familiar?.beneficios ?? null]
    });
  }

  private montarDtoAtualizacao(): Partial<CadastroUsuarioCompletoDTO> {
    const dados = this.form.getRawValue();
    const fichaAtual = this.usuario?.fichaSocioeconomica ?? { tipoMoradia: 'OUTRO' };
    const religiao = dados.professaReligiao ? (dados.religiao === 'Outra' ? dados.outraReligiao : dados.religiao) : 'Sem Religião';

    return {
      nomeCompleto: this.usuario?.nomeCompleto || '',
      dataNascimento: this.usuario?.dataNascimento || '',
      cpf: this.usuario?.cpf || null,
      documentoAuxiliar: this.usuario?.documentoAuxiliar ?? null,
      tipoDocumento: this.usuario?.tipoDocumento ?? null,
      cadUnico: this.usuario?.cadUnico || '',
      cep: this.usuario?.cep || '',
      bairro: this.usuario?.bairro || '',
      endereco: this.usuario?.endereco || '',
      escola: this.usuario?.escola || '',
      periodoEscolar: this.usuario?.periodoEscolar || '',
      serieEscolar: this.usuario?.serieEscolar || '',
      raEscolar: this.usuario?.raEscolar || '',
      idTurma: this.usuario?.idTurma ?? 0,
      contatos: this.usuario?.contatos?.map(contato => ({
        id: contato.id,
        nomeCompleto: contato.nomeCompleto,
        telefone: contato.telefone?.replace(/\D/g, '') || '',
        email: contato.email,
        endereco: contato.endereco,
        cpf: contato.cpf?.replace(/\D/g, '') || undefined,
        localTrabalho: contato.localTrabalho,
        parentesco: contato.parentesco || 'OUTRO',
        principal: !!contato.principal
      })) ?? [],
      composicaoFamiliar: (dados.composicaoFamiliar as ComposicaoFamiliarDTO[]).map(familiar => ({
        nomeCompleto: familiar.nomeCompleto || '',
        idade: Number(familiar.idade) || 0,
        parentescoVinculo: familiar.parentescoVinculo || '',
        escolaridade: familiar.escolaridade || '',
        renda: Number(familiar.renda) || 0,
        beneficios: Number(familiar.beneficios) || 0
      })),
      fichaSocioeconomica: {
        ...fichaAtual,
        tipoMoradia: dados.tipoMoradia || 'OUTRO',
        valorAluguel: ['ALUGADA', 'APARTAMENTO_ALUGADO'].includes(dados.tipoMoradia || '') ? Number(dados.valorAluguel) || 0 : 0,
        valorFinanciamento: ['PROPRIA', 'APARTAMENTO_PROPRIO'].includes(dados.tipoMoradia || '') ? Number(dados.valorFinanciamento) || 0 : 0,
        despesaEnergia: Number(dados.despesaEnergia) || 0,
        despesaAgua: Number(dados.despesaAgua) || 0,
        despesaInternet: Number(dados.despesaInternet) || 0,
        despesaTelefone: Number(dados.despesaTelefone) || 0,
        despesaMercado: Number(dados.despesaMercado) || 0,
        despesaFarmacia: Number(dados.despesaFarmacia) || 0,
        despesaFinanciamentos: Number(dados.despesaFinanciamentos) || 0,
        despesaOutras: Number(dados.despesaOutras) || 0,
        utilizaCarro: !!dados.utilizaCarro,
        gastoCarro: Number(dados.gastoCarro) || 0,
        utilizaMoto: !!dados.utilizaMoto,
        gastoMoto: Number(dados.gastoMoto) || 0,
        utilizaTransportePublico: !!dados.utilizaTransportePublico,
        gastoTransportePublico: Number(dados.gastoTransportePublico) || 0,
        utilizaVan: !!dados.utilizaVan,
        gastoVan: Number(dados.gastoVan) || 0,
        andandoOuBicicleta: !!dados.andandoOuBicicleta,
        religiao: religiao || 'Sem Religião'
      }
    };
  }
}
