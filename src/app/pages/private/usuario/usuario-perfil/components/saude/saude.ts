import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, NgZone, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ArquivoSaudeDTO, CadastroUsuarioCompletoDTO, UsuarioResponseDTO } from 'src/app/shared/models/usuario.model';
import { UsuarioService } from 'src/app/shared/services/usuario/usuario.service';
import { montarBaseAtualizacaoUsuario, montarFichaSocioeconomicaBase } from '../../utils/usuario-atualizacao-dto';
import {
  TAMANHO_MAXIMO_ARQUIVO_BYTES,
  obterMensagemErro,
  validarArquivo,
  validarExtensaoArquivo
} from 'src/app/shared/utils/form-validations';

@Component({
  selector: 'app-usuario-perfil-saude',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule
  ],
  templateUrl: './saude.html',
  styleUrl: './saude.css'
})
export class UsuarioPerfilSaude implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly usuarioService = inject(UsuarioService);
  private readonly toastr = inject(ToastrService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);

  @Input() usuario: UsuarioResponseDTO | null = null;
  @Input() somenteLeitura = false;
  @Output() usuarioAtualizado = new EventEmitter<UsuarioResponseDTO>();

  editando = false;
  salvando = false;
  carregandoArquivos = false;
  erroCarregarArquivos = '';
  erroArquivos = '';
  arquivosSaude: File[] = [];
  arquivosSaudeSalvos: ArquivoSaudeDTO[] = [];
  private descricaoValueChangesRegistrados = false;
  private valoresOriginais: unknown = null;
  readonly limiteArquivo = TAMANHO_MAXIMO_ARQUIVO_BYTES;

  readonly perguntasSaude = [
    { campo: 'possuiProblemaSaude', descricao: 'descProblemaSaude', label: 'Possui alguma condição de saúde?' },
    { campo: 'usaMedicacao', descricao: 'descMedicacao', label: 'Usa medicação?' },
    { campo: 'temAlergia', descricao: 'descAlergia', label: 'Tem alergia?' }
  ] as const;

  form = this.fb.group({
    possuiProblemaSaude: [false],
    descProblemaSaude: [''],
    usaMedicacao: [false],
    descMedicacao: [''],
    temAlergia: [false],
    descAlergia: ['']
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['usuario']) {
      this.preencherFormulario();
      this.carregarArquivos();
    }
  }

  get temAlteracoes(): boolean {
    return JSON.stringify(this.form.getRawValue()) !== JSON.stringify(this.valoresOriginais) || this.arquivosSaude.length > 0;
  }

  editar(): void {
    if (this.somenteLeitura) return;
    this.editando = true;
    this.form.enable();
  }

  cancelar(): void {
    this.preencherFormulario();
    this.arquivosSaude = [];
    this.erroArquivos = '';
  }

  salvar(): void {
    if (!this.usuario || this.somenteLeitura) return;

    this.form.markAllAsTouched();
    if (this.form.invalid || !this.temAlteracoes) return;

    let dto: Partial<CadastroUsuarioCompletoDTO>;
    try {
      dto = this.montarDtoAtualizacao();
    } catch (erro: any) {
      this.toastr.error(erro.message || 'Revise os campos obrigatórios antes de salvar.', 'Erro');
      return;
    }

    this.salvando = true;
    this.usuarioService.atualizar(this.usuario.id, dto).subscribe({
      next: usuarioAtualizado => {
        const uploads = this.arquivosSaude.map(arquivo => this.usuarioService.uploadArquivoSaude(usuarioAtualizado.id, arquivo));
        const upload$ = uploads.length ? forkJoin(uploads) : of([]);
        upload$.subscribe({
          next: () => {
            this.usuario = usuarioAtualizado;
            this.usuarioAtualizado.emit(usuarioAtualizado);
            this.arquivosSaude = [];
            this.preencherFormulario();
            this.carregarArquivos();
            this.salvando = false;
            this.toastr.success('Dados de saúde salvos com sucesso!', 'Sucesso');
          },
          error: () => {
            this.salvando = false;
            this.toastr.warning('Dados salvos, mas houve erro no envio de um ou mais anexos.', 'Aviso');
          }
        });
      },
      error: (err: any) => {
        this.salvando = false;
        this.toastr.error(err.error?.message || 'Erro ao salvar dados de saúde.', 'Erro');
      }
    });
  }

  selecionarArquivosSaude(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.erroArquivos = '';

    for (const arquivo of Array.from(input.files || [])) {
      const erro = validarArquivo(arquivo, validarExtensaoArquivo(
        ['pdf', 'jpg', 'jpeg', 'png'],
        ['application/pdf', 'image/jpeg', 'image/png'],
        this.limiteArquivo
      ));

      if (erro) {
        this.erroArquivos = obterMensagemErro(erro);
        continue;
      }

      if (this.arquivosSaude.length + this.arquivosSaudeSalvos.length >= 4) {
        this.erroArquivos = 'Selecione no máximo 4 arquivos.';
        break;
      }

      this.arquivosSaude.push(arquivo);
    }

    input.value = '';
  }

  removerArquivoSaude(index: number): void {
    this.arquivosSaude.splice(index, 1);
  }

  removerArquivoSaudeSalvo(arquivo: ArquivoSaudeDTO): void {
    this.usuarioService.deletarArquivoSaude(arquivo.id).subscribe({
      next: () => {
        this.arquivosSaudeSalvos = this.arquivosSaudeSalvos.filter(item => item.id !== arquivo.id);
      },
      error: () => this.toastr.error('Não foi possível remover o anexo de saúde.', 'Erro')
    });
  }

  urlArquivo(arquivo: ArquivoSaudeDTO): string {
    const caminho = arquivo.caminhoArquivo || '';
    if (caminho.startsWith('http://') || caminho.startsWith('https://')) return caminho;
    return `${environment.apiUrl}${caminho.startsWith('/') ? '' : '/'}${caminho}`;
  }

  iconeArquivo(nome: string): string {
    return nome.toLowerCase().endsWith('.pdf') ? 'description' : 'image';
  }

  private carregarArquivos(): void {
    if (!this.usuario?.id) return;

    this.carregandoArquivos = true;
    this.erroCarregarArquivos = '';
    this.atualizarTela();
    this.usuarioService.listarArquivosSaude(this.usuario.id).subscribe({
      next: arquivos => {
        this.ngZone.run(() => {
          this.arquivosSaudeSalvos = arquivos;
          this.carregandoArquivos = false;
          this.atualizarTela();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.carregandoArquivos = false;
          this.erroCarregarArquivos = 'Não foi possível carregar os anexos de saúde.';
          this.toastr.error(this.erroCarregarArquivos, 'Erro');
          this.atualizarTela();
        });
      }
    });
  }

  private preencherFormulario(): void {
    const ficha = this.usuario?.fichaSocioeconomica;
    this.form.reset({
      possuiProblemaSaude: !!ficha?.possuiProblemaSaude,
      descProblemaSaude: ficha?.descProblemaSaude ?? '',
      usaMedicacao: !!ficha?.usaMedicacao,
      descMedicacao: ficha?.descMedicacao ?? '',
      temAlergia: !!ficha?.temAlergia,
      descAlergia: ficha?.descAlergia ?? ''
    });

    this.atualizarValidadoresDescricao();
    if (!this.descricaoValueChangesRegistrados) {
      this.perguntasSaude.forEach(pergunta => {
        this.form.get(pergunta.campo)?.valueChanges.subscribe(() => this.atualizarValidadoresDescricao());
      });
      this.descricaoValueChangesRegistrados = true;
    }
    this.form.disable();
    this.valoresOriginais = this.form.getRawValue();
    this.editando = false;
    this.salvando = false;
  }

  private atualizarValidadoresDescricao(): void {
    this.perguntasSaude.forEach(pergunta => {
      const descricao = this.form.get(pergunta.descricao);
      if (this.form.get(pergunta.campo)?.value) {
        descricao?.setValidators([Validators.required]);
      } else {
        descricao?.clearValidators();
        descricao?.setValue('', { emitEvent: false });
      }
      descricao?.updateValueAndValidity({ emitEvent: false });
    });
  }

  private montarDtoAtualizacao(): Partial<CadastroUsuarioCompletoDTO> {
    const dados = this.form.getRawValue();
    const ficha = montarFichaSocioeconomicaBase(this.usuario!);

    return {
      ...montarBaseAtualizacaoUsuario(this.usuario!),
      fichaSocioeconomica: {
        ...ficha,
        possuiProblemaSaude: !!dados.possuiProblemaSaude,
        descProblemaSaude: dados.possuiProblemaSaude ? dados.descProblemaSaude || '' : '',
        usaMedicacao: !!dados.usaMedicacao,
        descMedicacao: dados.usaMedicacao ? dados.descMedicacao || '' : '',
        temAlergia: !!dados.temAlergia,
        descAlergia: dados.temAlergia ? dados.descAlergia || '' : ''
      }
    };
  }

  tentarCarregarArquivosNovamente(): void {
    this.carregarArquivos();
  }

  private atualizarTela(): void {
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }
}
