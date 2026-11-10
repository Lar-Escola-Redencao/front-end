import { AfterViewInit, Directive, ElementRef, HostBinding, HostListener, Input, OnDestroy, Renderer2, inject } from '@angular/core';

@Directive({ selector: '[appAnexoDrop]', standalone: true })
export class AnexoDrop implements AfterViewInit, OnDestroy {
  @Input({ required: true }) appAnexoDrop!: HTMLInputElement;
  @Input() anexoDropDesabilitado = false;
  @HostBinding('class.anexo-drop') readonly areaDeUpload = true;
  @HostBinding('class.anexo-arrastando') arrastando = false;

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private entradas = 0;
  private mensagemErro?: HTMLElement;
  private pararEscuta?: () => void;

  @HostBinding('attr.data-anexo-soltar') get mensagemSoltar(): string {
    return this.appAnexoDrop.multiple ? 'Solte os arquivos aqui' : 'Solte o arquivo aqui';
  }

  @HostBinding('attr.aria-disabled') get ariaDesabilitado(): string | null {
    return this.desabilitado ? 'true' : null;
  }

  @HostBinding('attr.title') get dica(): string {
    return this.desabilitado ? 'Aguarde o processamento.' : 'Arraste e solte os arquivos aqui ou utilize o botão para selecionar.';
  }

  ngAfterViewInit(): void {
    this.mensagemErro = this.renderer.createElement('span');
    this.renderer.addClass(this.mensagemErro, 'anexo-drop-erro');
    this.renderer.setAttribute(this.mensagemErro, 'role', 'alert');
    this.renderer.setProperty(this.mensagemErro, 'hidden', true);
    const host = this.elemento.nativeElement;
    this.renderer.insertBefore(host.parentNode, this.mensagemErro, host.nextSibling);
    this.pararEscuta = this.renderer.listen(this.appAnexoDrop, 'change', () => this.exibirErro(''));
  }

  ngOnDestroy(): void {
    this.pararEscuta?.();
    if (this.mensagemErro?.parentNode) this.renderer.removeChild(this.mensagemErro.parentNode, this.mensagemErro);
  }

  private exibirErro(mensagem: string): void {
    if (!this.mensagemErro) return;
    this.renderer.setProperty(this.mensagemErro, 'textContent', mensagem);
    this.renderer.setProperty(this.mensagemErro, 'hidden', !mensagem);
  }

  private get desabilitado(): boolean {
    return this.anexoDropDesabilitado || this.appAnexoDrop.disabled
      || !!this.elemento.nativeElement.closest('[inert], fieldset:disabled');
  }

  private contemArquivos(transferencia: DataTransfer | null): boolean {
    if (!transferencia) return false;
    return Array.from(transferencia.types ?? []).includes('Files')
      || Array.from(transferencia.items ?? []).some(item => item.kind === 'file')
      || transferencia.files?.length > 0;
  }

  @HostListener('dragenter', ['$event'])
  entrar(evento: DragEvent): void {
    if (!this.contemArquivos(evento.dataTransfer)) return;
    evento.preventDefault();
    this.entradas++;
    this.arrastando = !this.desabilitado;
  }

  @HostListener('dragover', ['$event'])
  arrastar(evento: DragEvent): void {
    if (!this.contemArquivos(evento.dataTransfer)) return;
    evento.preventDefault();
    this.arrastando = !this.desabilitado;
    if (evento.dataTransfer) evento.dataTransfer.dropEffect = this.desabilitado ? 'none' : 'copy';
  }

  @HostListener('dragleave', ['$event'])
  sair(evento: DragEvent): void {
    evento.preventDefault();
    this.entradas = Math.max(0, this.entradas - 1);
    if (this.entradas === 0) this.arrastando = false;
  }

  @HostListener('drop', ['$event'])
  soltar(evento: DragEvent): void {
    evento.preventDefault();
    evento.stopPropagation();
    this.entradas = 0;
    this.arrastando = false;
    if (this.desabilitado || !evento.dataTransfer?.files.length) return;

    const arquivos = Array.from(evento.dataTransfer.files);
    if (!this.appAnexoDrop.multiple && arquivos.length > 1) {
      this.exibirErro('Selecione apenas um arquivo por vez.');
      return;
    }
    this.exibirErro('');
    const transferencia = new DataTransfer();
    for (const arquivo of arquivos) {
      transferencia.items.add(arquivo);
    }
    this.appAnexoDrop.files = transferencia.files;
    this.appAnexoDrop.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
