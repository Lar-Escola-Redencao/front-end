import { Component, OnInit, inject, signal } from '@angular/core';
import { SocialLinksService } from '../../../../../shared/services/content-management/redes-sociais/social-links.service';
import { SocialLinkFormModal } from './social-link-form-modal';
import { ToggleSwitch } from 'src/app/shared/ui/toggle-switch/toggle-switch';
import { ToastService } from 'src/app/shared/ui/toast/toast.service';
import { environment } from 'src/environments/environment';
import { SocialLink } from 'src/app/shared/models/social-link.model';


@Component({
  selector: 'app-social-links-manager',
  imports: [SocialLinkFormModal, ToggleSwitch],
  templateUrl: './social-links-manager.html',
  styleUrls: ['./social-links-manager.css'],
})
export class SocialLinksManager implements OnInit {
  private readonly socialLinksService = inject(SocialLinksService);
  private readonly toastService = inject(ToastService);

  protected readonly apiUrl = environment.apiUrl;
  protected readonly socialLinks = signal<SocialLink[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadError = signal(false);

  protected readonly formModalOpen = signal(false);
  protected readonly editingSocialLink = signal<SocialLink | null>(null);

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const socialLinks = await this.socialLinksService.listarTodas();
      this.socialLinks.set(socialLinks);
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  openCreateModal(): void {
    this.editingSocialLink.set(null);
    this.formModalOpen.set(true);
  }

  openEditModal(socialLink: SocialLink): void {
    this.editingSocialLink.set(socialLink);
    this.formModalOpen.set(true);
  }

  closeFormModal(): void {
    this.formModalOpen.set(false);
    this.editingSocialLink.set(null);
  }

  onSaved(): void {
    this.closeFormModal();
    this.load();
  }

  async onToggleActive(socialLink: SocialLink, ativo: boolean): Promise<void> {
    try {
      await this.socialLinksService.update(socialLink.id, {
        nome: socialLink.nome,
        url: socialLink.url,
        icone: null,
        ativo,
      });
      this.load();
    } catch {
      this.toastService.error('Não foi possível atualizar o status da rede social.');
    }
  }
}
