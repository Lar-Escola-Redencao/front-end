import { Component, computed, inject, signal } from '@angular/core';
import { PartnersService } from './partners.service';
import { PartnerFormModal } from './partner-form-modal';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { ToggleSwitch } from '../../../shared/ui/toggle-switch/toggle-switch';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { Partner } from '../../../shared/models/partner.model';

@Component({
  selector: 'app-partners-manager',
  imports: [PartnerFormModal, Pagination, ToggleSwitch, ConfirmDialog],
  templateUrl: './partners-manager.html',
  styleUrls: ['../../../shared/styles/manager-table.css', './partners-manager.css'],
})
export class PartnersManager {
  private readonly partnersService = inject(PartnersService);
  private readonly toastService = inject(ToastService);

  protected readonly partners = this.partnersService.partners;

  protected readonly page = signal(1);
  protected readonly pageSize = signal(5);

  protected readonly pagedPartners = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.partners().slice(start, start + this.pageSize());
  });

  protected readonly formModalOpen = signal(false);
  protected readonly editingPartner = signal<Partner | null>(null);
  protected readonly pendingDelete = signal<Partner | null>(null);
  protected readonly deleting = signal(false);

  openCreateModal(): void {
    this.editingPartner.set(null);
    this.formModalOpen.set(true);
  }

  openEditModal(partner: Partner): void {
    this.editingPartner.set(partner);
    this.formModalOpen.set(true);
  }

  closeFormModal(): void {
    this.formModalOpen.set(false);
    this.editingPartner.set(null);
  }

  onSaved(): void {
    this.closeFormModal();
  }

  async onToggleActive(partner: Partner, active: boolean): Promise<void> {
    try {
      await this.partnersService.setActive(partner.id, active);
    } catch {
      this.toastService.error('Não foi possível atualizar o status do parceiro.');
    }
  }

  askDelete(partner: Partner): void {
    this.pendingDelete.set(partner);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  async confirmDelete(): Promise<void> {
    const partner = this.pendingDelete();
    if (!partner) {
      return;
    }
    this.deleting.set(true);
    try {
      await this.partnersService.remove(partner.id);
      this.toastService.success('Parceiro excluído com sucesso.');
      this.pendingDelete.set(null);
      if (this.pagedPartners().length === 0 && this.page() > 1) {
        this.page.set(this.page() - 1);
      }
    } catch {
      this.toastService.error('Não foi possível excluir o parceiro.');
    } finally {
      this.deleting.set(false);
    }
  }

  initials(name: string): string {
    return name.trim().slice(0, 1).toUpperCase();
  }
}
