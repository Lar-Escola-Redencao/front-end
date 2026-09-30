import { ChangeDetectorRef, Component, EventEmitter, Input, NgZone, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin, from } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ModalLayout } from '@components/modal-layout/modal-layout';
import { Evento, EventoRedeSocial } from 'src/app/shared/models/evento.model';
import { SocialLink } from 'src/app/shared/models/social-link.model';
import { EventoService } from 'src/app/shared/services/content-management/evento/evento.service';
import { SocialLinksService } from 'src/app/shared/services/content-management/redes-sociais/social-links.service';
import { PublicContentService } from 'src/app/shared/services/public-content/public-content.service';
import { Alertas } from 'src/app/shared/utils/alerts';

const URL_PATTERN = /^https?:\/\/.+/i;
const URL_TAMANHO_MAXIMO = 255;

interface LinhaRedeSocial {
  idRedeSocial: number;
  nome: string;
  icone: string;
  urlPadrao: string;
  vinculada: boolean;
  urlSalva: string;
  urlLink: string;
  erro: string;
  salvando: boolean;
}

@Component({
  selector: 'app-evento-redes-sociais',
  standalone: true,
  imports: [FormsModule, MatIconModule, ModalLayout],
  templateUrl: './evento-redes-sociais.component.html',
  styleUrls: ['./evento-redes-sociais.component.css']
})
export class EventoRedesSociaisComponent implements OnInit {
  @Input({ required: true }) evento!: Evento;
  @Output() fechado = new EventEmitter<void>();

  linhas: LinhaRedeSocial[] = [];
  carregando = false;
  erroCarregamento = false;
  modalTremendo = false;

  constructor(
    private eventoService: EventoService,
    private socialLinksService: SocialLinksService,
    private publicContentService: PublicContentService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    this.carregar();
  }

  get totalVinculadas(): number {
    return this.linhas.filter(l => l.vinculada).length;
  }

  carregar(): void {
    this.carregando = true;
    this.erroCarregamento = false;

    forkJoin({
      redesSociais: from(this.socialLinksService.listarTodas()),
      vinculos: this.eventoService.listarRedesSociais(this.evento.id)
    }).subscribe({
      next: ({ redesSociais, vinculos }) => {
        this.ngZone.run(() => {
          this.linhas = this.montarLinhas(redesSociais, vinculos);
          this.carregando = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.carregando = false;
          this.erroCarregamento = true;
          this.cdr.detectChanges();
        });
      }
    });
  }

  // Lista as redes sociais ativas (as únicas que o back aceita vincular) e também
  // as já vinculadas que foram inativadas depois, para que ainda possam ser desvinculadas.
  private montarLinhas(redesSociais: SocialLink[], vinculos: EventoRedeSocial[]): LinhaRedeSocial[] {
    const vinculosPorRede = new Map(vinculos.map(v => [v.idRedeSocial, v]));

    return redesSociais
      .filter(rede => rede.ativo || vinculosPorRede.has(rede.id))
      .map(rede => {
        const vinculo = vinculosPorRede.get(rede.id);
        return {
          idRedeSocial: rede.id,
          nome: rede.nome,
          icone: rede.icone,
          urlPadrao: rede.url,
          vinculada: !!vinculo,
          urlSalva: vinculo?.urlLink ?? '',
          urlLink: vinculo?.urlLink ?? '',
          erro: '',
          salvando: false
        };
      })
      .sort((a, b) => Number(b.vinculada) - Number(a.vinculada) || a.nome.localeCompare(b.nome));
  }

  foiAlterada(linha: LinhaRedeSocial): boolean {
    return linha.vinculada && linha.urlLink.trim() !== linha.urlSalva;
  }

  validar(linha: LinhaRedeSocial): boolean {
    const url = linha.urlLink.trim();

    if (url && !URL_PATTERN.test(url)) {
      linha.erro = 'Informe um link válido começando com http:// ou https://';
    } else if (url.length > URL_TAMANHO_MAXIMO) {
      linha.erro = `O link não pode ter mais de ${URL_TAMANHO_MAXIMO} caracteres`;
    } else {
      linha.erro = '';
    }

    return !linha.erro;
  }

  /** Cria o vínculo ou atualiza o link de um vínculo existente (o back faz upsert). */
  salvar(linha: LinhaRedeSocial): void {
    if (linha.salvando || !this.validar(linha)) {
      return;
    }

    const eraVinculada = linha.vinculada;
    const url = linha.urlLink.trim();
    linha.salvando = true;

    this.eventoService.vincularRedeSocial(this.evento.id, {
      idRedeSocial: linha.idRedeSocial,
      urlLink: url || undefined
    }).subscribe({
      next: (vinculo) => {
        this.ngZone.run(() => {
          linha.vinculada = true;
          linha.urlSalva = vinculo.urlLink;
          linha.urlLink = vinculo.urlLink;
          linha.salvando = false;
          this.toastr.success(
            eraVinculada ? 'Link atualizado com sucesso!' : `${linha.nome} vinculado ao evento!`,
            'Sucesso'
          );
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          linha.salvando = false;
          this.toastr.error(err.error?.message || 'Erro ao vincular rede social.', 'Erro');
          this.cdr.detectChanges();
        });
      }
    });
  }

  desvincular(linha: LinhaRedeSocial): void {
    if (linha.salvando) {
      return;
    }

    Alertas.confirmarExclusao(`O link do evento no ${linha.nome} será removido.`).then((confirmado) => {
      if (!confirmado) return;

      linha.salvando = true;
      this.cdr.detectChanges();

      this.eventoService.desvincularRedeSocial(this.evento.id, linha.idRedeSocial).subscribe({
        next: () => {
          this.ngZone.run(() => {
            linha.vinculada = false;
            linha.urlSalva = '';
            linha.urlLink = '';
            linha.erro = '';
            linha.salvando = false;
            this.toastr.success(`${linha.nome} desvinculado do evento.`, 'Sucesso');
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            linha.salvando = false;
            this.toastr.error(err.error?.message || 'Erro ao desvincular rede social.', 'Erro');
            this.cdr.detectChanges();
          });
        }
      });
    });
  }

  descartarAlteracao(linha: LinhaRedeSocial): void {
    linha.urlLink = linha.urlSalva;
    linha.erro = '';
  }

  fechar(): void {
    if (!this.linhas.some(l => this.foiAlterada(l))) {
      this.fechado.emit();
      return;
    }

    Alertas.confirmarDescarte().then((confirmado) => {
      this.ngZone.run(() => {
        if (confirmado) {
          this.fechado.emit();
        } else {
          this.dispararTremorModal();
        }
        this.cdr.detectChanges();
      });
    });
  }

  private dispararTremorModal(): void {
    this.modalTremendo = true;
    setTimeout(() => {
      this.modalTremendo = false;
      this.cdr.detectChanges();
    }, 400);
  }

  // Os ícones padrão (/images/...) são assets do front; os enviados por upload vêm do back.
  tratarImagem(caminho: string | null | undefined): string {
    return this.publicContentService.tratarUrlImagem(caminho);
  }

  esconderIcone(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
