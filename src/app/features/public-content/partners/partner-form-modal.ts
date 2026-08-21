import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Modal } from '../../../shared/ui/modal/modal';
import { ToggleSwitch } from '../../../shared/ui/toggle-switch/toggle-switch';
import { ImageDropzone } from '../../../shared/ui/image-dropzone/image-dropzone';
import { Partner } from '../../../shared/models/partner.model';
import { PartnersService } from './partners.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

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
  protected readonly imageTouched = signal(false);
  protected readonly active = signal(this.partner()?.active ?? true);

  protected readonly form = new FormGroup<{
    name: FormControl<string>;
    logoUrl: FormControl<string>;
  }>({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    logoUrl: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    const current = this.partner();
    if (current) {
      this.form.setValue({ name: current.name, logoUrl: current.logoUrl });
    }
  }

  protected onImageSelected(dataUrl: string): void {
    this.imageTouched.set(true);
    this.form.controls.logoUrl.setValue(dataUrl);
  }

  protected async onSubmit(): Promise<void> {
    this.imageTouched.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) {
      return;
    }

    this.saving.set(true);
    const value = { ...this.form.getRawValue(), active: this.active() };

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
