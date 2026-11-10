import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AnexoDrop } from './anexo-drop';
import { obterMensagemErro, validarArquivo, validarImagem } from '../utils/form-validations';

@Component({
  imports: [AnexoDrop],
  template: `<div [appAnexoDrop]="arquivo" [anexoDropDesabilitado]="bloqueado"><span>Solte aqui</span></div>
    <input #arquivo type="file" [multiple]="multiplo" (change)="selecionar($event)">`,
})
class CampoTeste {
  bloqueado = false;
  multiplo = false;
  selecionados: File[] = [];
  erro = '';
  selecionar(evento: Event): void {
    const arquivos = Array.from((evento.target as HTMLInputElement).files ?? []);
    this.erro = '';
    for (const arquivo of arquivos) {
      const erro = validarArquivo(arquivo, validarImagem());
      if (erro) { this.erro = obterMensagemErro(erro); return; }
    }
    this.selecionados = arquivos;
  }
}
class TransferenciaTeste {
  files: File[] = [];
  items = { add: (arquivo: File) => this.files.push(arquivo) };
}

describe('Arrastar e soltar anexos', () => {
  let fixture: ComponentFixture<CampoTeste>;
  let host: HTMLElement;
  let input: HTMLInputElement;
  const foto = () => new File(['imagem'], 'foto.png', { type: 'image/png' });

  beforeEach(() => {
    vi.stubGlobal('DataTransfer', TransferenciaTeste);
    fixture = TestBed.createComponent(CampoTeste);
    fixture.detectChanges();
    host = fixture.nativeElement.querySelector('div');
    input = fixture.nativeElement.querySelector('input');
    Object.defineProperty(input, 'files', { writable: true, value: [] });
  });
  afterEach(() => { fixture.destroy(); vi.unstubAllGlobals(); });

  function enviar(tipo: string, arquivos: File[], destino = host, tipos = ['Files']): Event {
    const evento = new Event(tipo, { bubbles: true, cancelable: true });
    Object.defineProperty(evento, 'dataTransfer', { value: { files: arquivos, types: tipos, dropEffect: '' } });
    destino.dispatchEvent(evento);
    fixture.detectChanges();
    return evento;
  }

  it('realça a área e remove o destaque após soltar', () => {
    enviar('dragenter', [foto()]);
    expect(host.hasAttribute('appAnexoDrop')).toBe(false);
    expect(host.matches('.anexo-drop.anexo-arrastando')).toBe(true);
    expect(host.getAttribute('data-anexo-soltar')).toBe('Solte o arquivo aqui');
    enviar('drop', [foto()]);
    expect(host.classList.contains('anexo-arrastando')).toBe(false);
    expect(fixture.componentInstance.selecionados[0].name).toBe('foto.png');
  });
  it('mantém o destaque ao atravessar elementos internos', () => {
    enviar('dragenter', []); enviar('dragenter', [], host.querySelector('span')!);
    enviar('dragleave', [], host.querySelector('span')!);
    expect(host.classList.contains('anexo-arrastando')).toBe(true);
    enviar('dragleave', []);
    expect(host.classList.contains('anexo-arrastando')).toBe(false);
  });
  it('recusa vários arquivos em campo único sem substituir a seleção anterior', () => {
    enviar('drop', [foto()]);
    const anterior = fixture.componentInstance.selecionados;
    enviar('drop', [foto(), foto()]);
    expect(fixture.componentInstance.selecionados).toBe(anterior);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('apenas um');
    enviar('drop', [foto()]);
    expect(fixture.nativeElement.querySelector('[role="alert"]').hidden).toBe(true);
  });
  it('encaminha todos os arquivos quando o campo permite múltiplos', () => {
    fixture.componentInstance.multiplo = true; fixture.changeDetectorRef.markForCheck(); fixture.detectChanges();
    enviar('drop', [foto(), foto()]);
    expect(fixture.componentInstance.selecionados.length).toBe(2);
  });
  it('usa a mesma validação de formato da seleção pelo botão', () => {
    const arquivo = new File(['texto'], 'arquivo.pdf', { type: 'application/pdf' });
    input.files = [arquivo] as unknown as FileList;
    input.dispatchEvent(new Event('change'));
    const erroBotao = fixture.componentInstance.erro;
    enviar('drop', [arquivo]);
    expect(fixture.componentInstance.erro).toBe(erroBotao);
    expect(erroBotao).not.toBe('');
  });
  it('usa a mesma validação do limite de 10 MB', () => {
    const arquivo = foto(); Object.defineProperty(arquivo, 'size', { value: 10 * 1024 * 1024 + 1 });
    enviar('drop', [arquivo]);
    expect(fixture.componentInstance.erro).toContain('10');
    expect(fixture.componentInstance.selecionados).toEqual([]);
  });
  it('bloqueia a soltura durante processamento e quando o input está desabilitado', () => {
    fixture.componentInstance.bloqueado = true; fixture.changeDetectorRef.markForCheck(); fixture.detectChanges();
    const evento = enviar('drop', [foto()]);
    expect(evento.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.selecionados).toEqual([]);
    fixture.componentInstance.bloqueado = false; fixture.changeDetectorRef.markForCheck(); fixture.detectChanges(); input.disabled = true;
    enviar('drop', [foto()]);
    expect(fixture.componentInstance.selecionados).toEqual([]);
  });
  it('ativa o destaque mesmo quando o primeiro evento reconhecido é dragover', () => {
    const evento = enviar('dragover', [foto()]);
    expect(evento.defaultPrevented).toBe(true);
    expect(host.classList.contains('anexo-arrastando')).toBe(true);
  });
  it('reconhece listas de tipos semelhantes a DOMStringList', () => {
    const tipos = { 0: 'Files', length: 1, item: () => 'Files' };
    enviar('dragover', [foto()], host, tipos as unknown as string[]);
    expect(host.classList.contains('anexo-arrastando')).toBe(true);
  });
  it('reconhece arquivos pelos itens mesmo antes da lista de arquivos ficar disponível', () => {
    const evento = new Event('dragover', { bubbles: true, cancelable: true });
    Object.defineProperty(evento, 'dataTransfer', {
      value: { types: [], files: [], items: [{ kind: 'file', type: 'image/png' }], dropEffect: '' },
    });
    host.dispatchEvent(evento); fixture.detectChanges();
    expect(evento.defaultPrevented).toBe(true);
    expect(host.classList.contains('anexo-arrastando')).toBe(true);
  });
  it('atualiza o destaque sem uma detecção manual da tela', async () => {
    const evento = new Event('dragenter', { bubbles: true, cancelable: true });
    Object.defineProperty(evento, 'dataTransfer', { value: { types: ['Files'], files: [] } });
    host.dispatchEvent(evento);
    await fixture.whenStable();
    expect(host.classList.contains('anexo-arrastando')).toBe(true);
  });
  it('ignora arraste de texto', () => {
    const evento = enviar('dragenter', [], host, ['text/plain']);
    expect(evento.defaultPrevented).toBe(false);
    expect(host.classList.contains('anexo-arrastando')).toBe(false);
  });
});
