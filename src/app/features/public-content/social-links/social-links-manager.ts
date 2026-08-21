import { Component, computed, inject, signal } from '@angular/core';
import { SocialLinksService } from './social-links.service';
import { SocialLinkFormModal } from './social-link-form-modal';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { ToggleSwitch } from '../../../shared/ui/toggle-switch/toggle-switch';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { SOCIAL_PLATFORM_OPTIONS, SocialLink } from '../../../shared/models/social-link.model';

@Component({
  selector: 'app-social-links-manager',
  imports: [SocialLinkFormModal, Pagination, ToggleSwitch, ConfirmDialog],
  templateUrl: './social-links-manager.html',
  styleUrls: ['../../../shared/styles/manager-table.css', './social-links-manager.css'],
})
export class SocialLinksManager {
  private readonly socialLinksService = inject(SocialLinksService);
  private readonly toastService = inject(ToastService);

  protected readonly socialLinks = this.socialLinksService.socialLinks;

  protected readonly page = signal(1);
  protected readonly pageSize = signal(5);

  protected readonly pagedSocialLinks = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.socialLinks().slice(start, start + this.pageSize());
  });

  protected readonly formModalOpen = signal(false);
  protected readonly editingSocialLink = signal<SocialLink | null>(null);
  protected readonly pendingDelete = signal<SocialLink | null>(null);
  protected readonly deleting = signal(false);

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
  }

  async onToggleActive(socialLink: SocialLink, active: boolean): Promise<void> {
    try {
      await this.socialLinksService.setActive(socialLink.id, active);
    } catch {
      this.toastService.error('Não foi possível atualizar o status da rede social.');
    }
  }

  askDelete(socialLink: SocialLink): void {
    this.pendingDelete.set(socialLink);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  async confirmDelete(): Promise<void> {
    const socialLink = this.pendingDelete();
    if (!socialLink) {
      return;
    }
    this.deleting.set(true);
    try {
      await this.socialLinksService.remove(socialLink.id);
      this.toastService.success('Rede social excluída com sucesso.');
      this.pendingDelete.set(null);
      if (this.pagedSocialLinks().length === 0 && this.page() > 1) {
        this.page.set(this.page() - 1);
      }
    } catch {
      this.toastService.error('Não foi possível excluir a rede social.');
    } finally {
      this.deleting.set(false);
    }
  }

  platformLabel(platform: SocialLink['platform']): string {
    return SOCIAL_PLATFORM_OPTIONS.find((option) => option.value === platform)?.label ?? platform;
  }
}
