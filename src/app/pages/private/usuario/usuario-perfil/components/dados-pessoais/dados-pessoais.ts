import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';
import { CadastroUsuarioCompletoDTO, UsuarioResponseDTO } from 'src/app/shared/models/usuario.model';
import { UsuarioService } from 'src/app/shared/services/usuario/usuario.service';
import { obterMensagemErro, validarArquivo, validarExtensaoArquivo } from 'src/app/shared/utils/form-validations';
import { formatarCep, formatarCpf } from 'src/app/shared/utils/masks';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-usuario-perfil-dados-pessoais',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './dados-pessoais.html',
  styleUrl: './dados-pessoais.css'
})
export class UsuarioPerfilDadosPessoais implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly usuarioService = inject(UsuarioService);
  private readonly toastr = inject(ToastrService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  @Input() usuario: UsuarioResponseDTO | null = null;
  @Input() somenteLeitura = false;
  @Output() usuarioAtualizado = new EventEmitter<UsuarioResponseDTO>();

  editando = false;
  salvando = false;
  fotoSelecionada: File | null = null;
  fotoPreviewUrl: string | null = null;
  fotoPerfilValidadaUrl: string | null = null;
  erroFoto = '';
  private valoresOriginais: unknown = null;

  readonly periodosEscolares = [
    { value: 'MANHA', label: 'Manhã' },
    { value: 'TARDE', label: 'Tarde' },
    { value: 'INTEGRAL', label: 'Integral' },
    { value: 'OUTRO', label: 'Outro' }
  ];

  readonly seriesEscolares = [
    { value: 'PRE_ESCOLA', label: 'Pré-escola' },
    ...Array.from({ length: 9 }, (_, i) => ({ value: `SERIE_${i + 1}`, label: `${i + 1}º ano` })),
    { value: 'EM', label: 'Ensino médio' }
  ];

  readonly tiposDocumento = [
    { label: 'Certidão de Nascimento', value: 'CERTIDAO_NASCIMENTO' },
    { label: 'CRNM/RNE', value: 'CRNM_RNE' },
    { label: 'Outro', value: 'OUTRO' }
  ];

  form = this.fb.group({
    nomeCompleto: ['', [Validators.required, Validators.minLength(3)]],
    dataNascimento: ['', Validators.required],
    cpf: [''],
    tipoDocumento: [''],
    documentoAuxiliar: [''],
    cadUnico: [''],
    usarOutroDocumento: [{ value: false, disabled: true }],
    cep: [''],
    bairro: ['', Validators.required],
    endereco: ['', Validators.required],
    escola: ['', Validators.required],
    periodoEscolar: ['', Validators.required],
    serieEscolar: ['', Validators.required],
    raEscolar: ['']
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['usuario']) {
      this.preencherFormulario();
    }
  }

  get temAlteracoes(): boolean {
    return JSON.stringify(this.form.getRawValue()) !== JSON.stringify(this.valoresOriginais) || !!this.fotoSelecionada;
  }

  get usaOutroDocumento(): boolean {
    return !!this.form.get('usarOutroDocumento')?.value;
  }

  get fotoPreview(): string | null {
    return this.fotoPreviewUrl || this.fotoPerfilValidadaUrl;
  }

  onErroFotoPreview(): void {
    this.fotoPreviewUrl = null;
    this.fotoPerfilValidadaUrl = null;
  }

  editar(): void {
    if (this.somenteLeitura) return;
    this.editando = true;
    this.form.enable();
  }

  cancelar(): void {
    this.preencherFormulario();
    this.fotoSelecionada = null;
    this.fotoPreviewUrl = null;
    this.erroFoto = '';
  }

  salvar(): void {
    if (!this.usuario || this.somenteLeitura) return;

    this.form.markAllAsTouched();
    if (this.form.invalid || !this.temAlteracoes) return;

    this.salvando = true;
    const dto = this.montarDtoAtualizacao();

    this.usuarioService.atualizar(this.usuario.id, dto).subscribe({
      next: usuarioAtualizado => {
        if (!this.fotoSelecionada) {
          this.finalizarSalvar(usuarioAtualizado);
          return;
        }

        this.usuarioService.atualizarFotoPerfil(usuarioAtualizado.id, this.fotoSelecionada).subscribe({
          next: () => this.finalizarSalvar({
            ...usuarioAtualizado,
            imagemPerfil: this.fotoPreviewUrl ? String(this.fotoPreviewUrl) : usuarioAtualizado.imagemPerfil
          }),
          error: () => {
            this.finalizarSalvar(usuarioAtualizado);
            this.toastr.warning('Dados salvos, mas não foi possível atualizar a foto.', 'Aviso');
          }
        });
      },
      error: (err: any) => {
        this.salvando = false;
        this.toastr.error(err.error?.message || 'Erro ao salvar dados pessoais.', 'Erro');
      }
    });
  }

  onFotoSelecionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) return;

    this.erroFoto = '';
    const erro = validarArquivo(arquivo, validarExtensaoArquivo(['jpg', 'jpeg', 'png'], ['image/jpeg', 'image/png']));
    if (erro) {
      this.erroFoto = obterMensagemErro(erro);
      input.value = '';
      return;
    }

    this.fotoSelecionada = arquivo;
    const reader = new FileReader();
    reader.onload = () => {
      this.fotoPreviewUrl = String(reader.result);
    };
    reader.readAsDataURL(arquivo);
    input.value = '';
  }

  aplicarMascaraCpf(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valor = formatarCpf(input.value);
    input.value = valor;
    this.form.get('cpf')?.setValue(valor, { emitEvent: false });
  }

  aplicarMascaraCep(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valor = formatarCep(input.value);
    input.value = valor;
    this.form.get('cep')?.setValue(valor, { emitEvent: false });
  }

  mensagemErro(campo: keyof typeof this.form.controls): string {
    const controle = this.form.get(campo);
    if (!controle || !controle.touched || !controle.errors) return '';
    if (controle.errors['required']) return 'Campo obrigatório.';
    if (controle.errors['minlength']) return 'Mínimo de 3 caracteres.';
    return 'Campo inválido.';
  }

  private preencherFormulario(): void {
    this.fotoPerfilValidadaUrl = null;
    this.form.reset({
      nomeCompleto: this.usuario?.nomeCompleto ?? '',
      dataNascimento: this.normalizarData(this.usuario?.dataNascimento),
      cpf: formatarCpf(this.usuario?.cpf ?? ''),
      tipoDocumento: this.usuario?.tipoDocumento ?? 'CERTIDAO_NASCIMENTO',
      documentoAuxiliar: this.usuario?.documentoAuxiliar ?? '',
      cadUnico: this.usuario?.cadUnico ?? '',
      usarOutroDocumento: !!this.usuario?.documentoAuxiliar,
      cep: formatarCep(this.usuario?.cep ?? ''),
      bairro: this.usuario?.bairro ?? '',
      endereco: this.usuario?.endereco ?? '',
      escola: this.usuario?.escola ?? '',
      periodoEscolar: this.usuario?.periodoEscolar ?? '',
      serieEscolar: this.usuario?.serieEscolar ?? '',
      raEscolar: this.usuario?.raEscolar ?? ''
    });
    this.form.disable();
    this.valoresOriginais = this.form.getRawValue();
    this.editando = false;
    this.salvando = false;
    this.erroFoto = '';
    this.validarFotoPerfilExistente();
  }

  private montarDtoAtualizacao(): Partial<CadastroUsuarioCompletoDTO> {
    const dados = this.form.getRawValue();
    return {
      nomeCompleto: dados.nomeCompleto || '',
      dataNascimento: dados.dataNascimento || '',
      cpf: dados.usarOutroDocumento ? null : dados.cpf?.replace(/\D/g, '') || null,
      documentoAuxiliar: dados.usarOutroDocumento ? dados.documentoAuxiliar || null : null,
      tipoDocumento: dados.usarOutroDocumento ? dados.tipoDocumento || null : null,
      cadUnico: dados.cadUnico || '',
      cep: dados.cep?.replace(/\D/g, '') || '',
      bairro: dados.bairro || '',
      endereco: dados.endereco || '',
      escola: dados.escola || '',
      periodoEscolar: dados.periodoEscolar || '',
      serieEscolar: dados.serieEscolar || '',
      raEscolar: dados.raEscolar || '',
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
      composicaoFamiliar: this.usuario?.composicaoFamiliar ?? [],
      fichaSocioeconomica: this.usuario?.fichaSocioeconomica ?? { tipoMoradia: 'OUTRO' }
    };
  }

  private finalizarSalvar(usuarioAtualizado: UsuarioResponseDTO): void {
    this.salvando = false;
    this.usuario = usuarioAtualizado;
    this.fotoSelecionada = null;
    this.fotoPreviewUrl = null;
    this.preencherFormulario();
    this.usuarioAtualizado.emit(usuarioAtualizado);
    this.toastr.success('Dados pessoais salvos com sucesso!', 'Sucesso');
  }

  private normalizarData(valor?: string | null): string {
    return valor ? valor.split('T')[0] : '';
  }

  private obterUrlArquivo(valor?: string | null): string | null {
    if (!valor) return null;
    if (valor.startsWith('http://') || valor.startsWith('https://') || valor.startsWith('data:') || valor.startsWith('/images/')) {
      return valor;
    }
    return `${environment.apiUrl}${valor}`;
  }

  private validarFotoPerfilExistente(): void {
    const url = this.obterUrlArquivo(this.usuario?.imagemPerfil);
    if (!url) return;

    const imagem = new Image();
    imagem.onload = () => {
      if (this.obterUrlArquivo(this.usuario?.imagemPerfil) !== url) return;
      this.fotoPerfilValidadaUrl = url;
      this.changeDetectorRef.markForCheck();
    };
    imagem.src = url;
  }
}
