import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../../../../../environments/environment';
import { Modal } from '../../../../../shared/ui/modal/modal';
import { ToggleSwitch } from '../../../../../shared/ui/toggle-switch/toggle-switch';
import { ImageDropzone } from '../../../../../shared/ui/image-dropzone/image-dropzone';
import { Partner } from '../../../../../shared/models/partner.model';
import { PartnersService } from '../../../../../shared/services/parceiro/partners.service';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-partner-form-modal',
  imports: [Modal, ToggleSwitch, ImageDropzone, ReactiveFormsModule],
  templateUrl: './partner-form-modal.html',
})
export class PartnerFormModal {
  private readonly partnersService = inject(PartnersService);
  private readonly toastService = inject(ToastService);

  readonly partner = input<Partner | null>(null);
  readonly saved = output<void>();
  readonly closed = output<void>();

  protected readonly isEditMode = computed(() => this.partner() !== null);
  protected readonly saving = signal(false);
  protected readonly logoFile = signal<File | null>(null);
  protected readonly logoTouched = signal(false);
  protected readonly active = signal(true);

  protected readonly logoPreviewUrl = computed(() => {
    const file = this.logoFile();
    if (file) {
      return URL.createObjectURL(file);
    }
    const current = this.partner()?.logo;
    return current ? `${environment.apiUrl}${current}` : null;
  });

  protected readonly form = new FormGroup({
    nome: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(50)],
    }),
  });

  constructor() {
    effect(() => {
      const current = this.partner();
      if (current) {
        this.form.setValue({ nome: current.nome });
        this.active.set(current.ativo);
      }
    });
  }

  protected onLogoSelected(file: File): void {
    this.logoTouched.set(true);
    this.logoFile.set(file);
  }

  protected async onSubmit(): Promise<void> {
    this.logoTouched.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || (!this.isEditMode() && !this.logoFile()) || this.saving()) {
      return;
    }

    this.saving.set(true);
    const value = { nome: this.form.getRawValue().nome, logo: this.logoFile(), ativo: this.active() };

    try {
      const current = this.partner();
      if (current) {
        await this.partnersService.update(current.id, value);
        this.toastService.success('Parceiro atualizado com sucesso.');
      } else {
        await this.partnersService.create(value);
        this.toastService.success('Parceiro cadastrado com sucesso.');
      }
      this.saved.emit();
    } catch {
      this.toastService.error('Não foi possível salvar o parceiro. Tente novamente.');
    } finally {
      this.saving.set(false);
    }
  }
}
