import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Modal } from '../../../shared/ui/modal/modal';
import { ToggleSwitch } from '../../../shared/ui/toggle-switch/toggle-switch';
import {
  SOCIAL_PLATFORM_OPTIONS,
  SocialLink,
  SocialPlatform,
} from '../../../shared/models/social-link.model';
import { SocialLinksService } from './social-links.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

const URL_PATTERN = /^https?:\/\/.+/i;

@Component({
  selector: 'app-social-link-form-modal',
  imports: [Modal, ToggleSwitch, ReactiveFormsModule],
  templateUrl: './social-link-form-modal.html',
})
export class SocialLinkFormModal {
  private readonly socialLinksService = inject(SocialLinksService);
  private readonly toastService = inject(ToastService);

  readonly socialLink = input<SocialLink | null>(null);
  readonly saved = output<void>();
  readonly closed = output<void>();

  protected readonly platformOptions = SOCIAL_PLATFORM_OPTIONS;
  protected readonly isEditMode = computed(() => this.socialLink() !== null);
  protected readonly saving = signal(false);
  protected readonly active = signal(this.socialLink()?.active ?? true);

  protected readonly form = new FormGroup<{
    platform: FormControl<SocialPlatform>;
    label: FormControl<string>;
    url: FormControl<string>;
  }>({
    platform: new FormControl<SocialPlatform>('instagram', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    label: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    url: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(URL_PATTERN)],
    }),
  });

  constructor() {
    const current = this.socialLink();
    if (current) {
      this.form.setValue({ platform: current.platform, label: current.label, url: current.url });
    }
  }

  protected async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) {
      return;
    }

    this.saving.set(true);
    const value = { ...this.form.getRawValue(), active: this.active() };

    try {
      const current = this.socialLink();
      if (current) {
        await this.socialLinksService.update(current.id, value);
        this.toastService.success('Rede social atualizada com sucesso.');
      } else {
        await this.socialLinksService.create(value);
        this.toastService.success('Rede social cadastrada com sucesso.');
      }
      this.saved.emit();
    } catch {
      this.toastService.error('Não foi possível salvar a rede social. Tente novamente.');
    } finally {
      this.saving.set(false);
    }
  }
}
