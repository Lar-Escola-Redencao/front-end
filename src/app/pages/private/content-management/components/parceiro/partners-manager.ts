import { Component, OnInit, inject, signal } from '@angular/core';
import { environment } from '../../../../../../environments/environment';
import { PartnersService } from '../../../../../shared/services/content-management/parceiro/partners.service';
import { ToggleSwitch } from '../../../../../shared/ui/toggle-switch/toggle-switch';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { Partner } from '../../../../../shared/models/partner.model';
import { PartnerFormModal } from './partner-form-modal';

@Component({
  selector: 'app-partners-manager',
  imports: [PartnerFormModal, ToggleSwitch],
  templateUrl: './partners-manager.html',
  styleUrls: ['./partners-manager.css'],
})
export class PartnersManager implements OnInit {
  private readonly partnersService = inject(PartnersService);
  private readonly toastService = inject(ToastService);

  protected readonly apiUrl = environment.apiUrl;
  protected readonly partners = signal<Partner[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadError = signal(false);

  protected readonly formModalOpen = signal(false);
  protected readonly editingPartner = signal<Partner | null>(null);

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const partners = await this.partnersService.listarTodos();
      this.partners.set(partners);
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

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
    this.load();
  }

  async onToggleActive(partner: Partner, ativo: boolean): Promise<void> {
    try {
      await this.partnersService.update(partner.id, { nome: partner.nome, logo: null, ativo });
      this.load();
    } catch {
      this.toastService.error('Não foi possível atualizar o status do parceiro.');
    }
  }

  initials(nome: string): string {
    return nome.trim().slice(0, 1).toUpperCase();
  }
}
