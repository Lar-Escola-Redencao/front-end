import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { SocialLinksService } from '../../../../../shared/services/redes-sociais/social-links.service';
import { Modal } from 'src/app/shared/ui/modal/modal';
import { ToggleSwitch } from 'src/app/shared/ui/toggle-switch/toggle-switch';
import { ImageDropzone } from 'src/app/shared/ui/image-dropzone/image-dropzone';
import { ToastService } from 'src/app/shared/ui/toast/toast.service';
import { SocialLink } from 'src/app/shared/models/social-link.model';
import { environment } from 'src/environments/environment';

const URL_PATTERN = /^https?:\/\/.+/i;

@Component({
  selector: 'app-social-link-form-modal',
  imports: [Modal, ToggleSwitch, ImageDropzone, ReactiveFormsModule],
  templateUrl: './social-link-form-modal.html',
})
export class SocialLinkFormModal {
  private readonly socialLinksService = inject(SocialLinksService);
  private readonly toastService = inject(ToastService);

  readonly socialLink = input<SocialLink | null>(null);
  readonly saved = output<void>();
  readonly closed = output<void>();

  protected readonly isEditMode = computed(() => this.socialLink() !== null);
  protected readonly saving = signal(false);
  protected readonly iconFile = signal<File | null>(null);
  protected readonly iconTouched = signal(false);
  protected readonly active = signal(true);

  protected readonly iconPreviewUrl = computed(() => {
    const file = this.iconFile();
    if (file) {
      return URL.createObjectURL(file);
    }
    const current = this.socialLink()?.icone;
    return current ? `${environment.apiUrl}${current}` : null;
  });

  protected readonly form = new FormGroup({
    nome: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    url: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(URL_PATTERN), Validators.maxLength(255)],
    }),
  });

  constructor() {
    effect(() => {
      const current = this.socialLink();
      if (current) {
        this.form.setValue({ nome: current.nome, url: current.url });
        this.active.set(current.ativo);
      }
    });
  }

  protected onIconSelected(file: File): void {
    this.iconTouched.set(true);
    this.iconFile.set(file);
  }

  protected async onSubmit(): Promise<void> {
    this.iconTouched.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || (!this.isEditMode() && !this.iconFile()) || this.saving()) {
      return;
    }

    this.saving.set(true);
    const value = { ...this.form.getRawValue(), icone: this.iconFile(), ativo: this.active() };

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
