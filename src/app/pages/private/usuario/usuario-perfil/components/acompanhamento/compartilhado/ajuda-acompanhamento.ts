import { Component, Input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { OverlayModule, ConnectedPosition } from '@angular/cdk/overlay';

@Component({
  selector: 'app-ajuda-acompanhamento', standalone: true,
  imports: [MatIconModule, OverlayModule],
  template: `
    <button type="button" cdkOverlayOrigin #origem="cdkOverlayOrigin"
      [attr.aria-label]="frequencia ? 'Como funciona a frequência' : entrevista ? 'Orientações para registrar entrevistas' : 'Orientações para registrar ocorrências'"
      [attr.aria-expanded]="aberta()" [attr.aria-controls]="aberta() ? idPainel : null"
      (click)="aberta.set(!aberta())" (keydown.escape)="aberta.set(false); $event.stopPropagation()">
      <mat-icon aria-hidden="true">help_outline</mat-icon>
    </button>
    <ng-template cdkConnectedOverlay [cdkConnectedOverlayOrigin]="origem" [cdkConnectedOverlayOpen]="aberta()"
      cdkConnectedOverlayPanelClass="dica-acompanhamento-overlay"
      [cdkConnectedOverlayUsePopover]="null"
      [cdkConnectedOverlayPositions]="posicoes" [cdkConnectedOverlayPush]="true" [cdkConnectedOverlayViewportMargin]="16"
      [cdkConnectedOverlayHasBackdrop]="true" cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
      (backdropClick)="aberta.set(false)" (overlayKeydown)="aoTeclar($event)">
      <section class="dica-painel" [id]="idPainel" role="region" [attr.aria-label]="frequencia ? 'Como funciona a frequência' : entrevista ? 'Orientações para entrevistas' : 'Orientações para ocorrências'">
        <strong>{{ frequencia ? 'Frequência do usuário' : entrevista ? 'Registro da entrevista' : 'Registro da ocorrência' }}</strong>
        <p>{{ texto }}</p>
      </section>
    </ng-template>
  `,
  styles: [`
    :host { display: inline-flex; }
    button { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px;
      padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--input-color); cursor: pointer; }
    button:hover { color: var(--primary-color); background: #f5f5f5; }
    button:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
    button[aria-expanded="true"] { color: var(--primary-color); background: #f5f5f5; }
    .dica-painel { box-sizing: border-box; width: min(300px, calc(100vw - 32px)); max-height: 65vh;
      overflow-y: auto; padding: 16px; border: 1px solid #ddd; border-radius: 8px;
      background: var(--branco, #fff); box-shadow: var(--sombra-padrao, 0 2px 6px #0002);
      color: var(--preto, #222); font-family: var(--fonte-texto); font-size: 14px; line-height: 1.5; text-align: left; }
    strong { display: block; text-align: center; font-weight: 600; }
    p { margin: 12px 0 0; color: #737373; }
  `],
})
export class AjudaAcompanhamento {
  private static proximoId = 0;
  readonly idPainel = `dica-acompanhamento-${++AjudaAcompanhamento.proximoId}`;
  readonly aberta = signal(false);
  readonly posicoes: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
  ];
  @Input() entrevista = false;
  @Input() diario = false;
  @Input() frequencia = false;
  aoTeclar(evento: KeyboardEvent): void {
    if (evento.key === 'Escape') { this.aberta.set(false); evento.stopPropagation(); }
  }
  get texto(): string {
    if (this.frequencia) return 'Os gráficos mostram as presenças e faltas registradas no período e nas matrículas selecionadas. '
      + 'Dias sem registro não são contabilizados como faltas. Os filtros desta seção afetam apenas os gráficos de frequência.';
    return this.entrevista
      ? 'Registro de informações relevantes obtidas durante a entrevista, observações, relatos, encaminhamentos e evolução do acompanhamento.'
      : 'Registre fatos pontuais do cotidiano do usuário, como situações de comportamento, saúde ou assistência. '
        + (this.diario ? 'Informe horário, tipo e uma descrição objetiva do ocorrido.'
          : 'Informe data, horário, tipo e uma descrição objetiva do ocorrido.');
  }
}
