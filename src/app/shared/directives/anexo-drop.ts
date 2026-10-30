import { Directive, ElementRef, HostBinding, HostListener, Input, inject } from '@angular/core';

@Directive({ selector: '[appAnexoDrop]', standalone: true })
export class AnexoDrop {
  @Input({ required: true }) appAnexoDrop!: HTMLInputElement;
  @Input() anexoDropDesabilitado = false;
  @HostBinding('class.anexo-arrastando') arrastando = false;

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private entradas = 0;

  private get desabilitado(): boolean {
    return this.anexoDropDesabilitado || this.appAnexoDrop.disabled
      || !!this.elemento.nativeElement.closest('[inert]');
  }

  @HostListener('dragenter', ['$event'])
  entrar(evento: DragEvent): void {
    if (!evento.dataTransfer?.types.includes('Files')) return;
    evento.preventDefault();
    this.entradas++;
    this.arrastando = !this.desabilitado;
  }

  @HostListener('dragover', ['$event'])
  arrastar(evento: DragEvent): void {
    if (!evento.dataTransfer?.types.includes('Files')) return;
    evento.preventDefault();
    evento.dataTransfer.dropEffect = this.desabilitado ? 'none' : 'copy';
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

    const transferencia = new DataTransfer();
    const arquivos = Array.from(evento.dataTransfer.files);
    for (const arquivo of this.appAnexoDrop.multiple ? arquivos : arquivos.slice(0, 1)) {
      transferencia.items.add(arquivo);
    }
    this.appAnexoDrop.files = transferencia.files;
    this.appAnexoDrop.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
