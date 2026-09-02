import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { Auth } from 'src/app/shared/services/auth/auth';
import { formatarCpf, pareceEmail } from 'src/app/shared/utils/masks';

const SESSION_EXPIRED_TOAST_MS = 6000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Accepts either a full e-mail or an 11-digit CPF (mask characters ignored). */
function identifierValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '').trim();
  if (!value) {
    return null;
  }
  if (pareceEmail(value)) {
    return EMAIL_PATTERN.test(value) ? null : { identifier: true };
  }
  return value.replace(/\D/g, '').length === 11 ? null : { identifier: true };
}

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, PublicNavbar],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showForgotHint = signal(false);

  private readonly queryParams = toSignal(this.route.queryParamMap);
  private readonly sessionExpiredParam = computed(
    () => this.queryParams()?.get('reason') === 'expired',
  );
  private readonly toastDismissed = signal(false);
  protected readonly showSessionExpiredToast = computed(
    () => this.sessionExpiredParam() && !this.toastDismissed(),
  );

  constructor() {
    effect((onCleanup) => {
      if (!this.sessionExpiredParam()) {
        return;
      }
      const timer = setTimeout(() => this.toastDismissed.set(true), SESSION_EXPIRED_TOAST_MS);
      onCleanup(() => clearTimeout(timer));
    });
  }

  protected dismissSessionExpiredToast(): void {
    this.toastDismissed.set(true);
  }

  protected readonly form = new FormGroup({
    identifier: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, identifierValidator],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    remember: new FormControl(false, { nonNullable: true }),
  });

  /**
   * Applies the CPF mask live while the field looks numeric; the instant a letter or `@` shows
   * up, masking stops and the raw text is left alone so the user can type an e-mail freely.
   */
  protected onIdentifierInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (pareceEmail(input.value)) {
      return;
    }

    const masked = formatarCpf(input.value);
    this.form.controls.identifier.setValue(masked, { emitEvent: false });
    input.value = masked;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { identifier, password, remember } = this.form.getRawValue();
    const cleanedIdentifier = pareceEmail(identifier)
      ? identifier.trim()
      : identifier.replace(/\D/g, '');

    this.loading.set(true);
    this.errorMessage.set(null);

    this.auth.login({ identifier: cleanedIdentifier, password }, remember).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(this.resolveErrorMessage(error));
      },
    });
  }

  protected toggleForgotHint(): void {
    this.showForgotHint.update((value) => !value);
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401 || error.status === 400) {
        return 'E-mail ou senha inválidos.';
      }
      if (error.status === 0) {
        return 'Não foi possível conectar ao servidor. Tente novamente.';
      }
    }
    return 'Ocorreu um erro ao entrar. Tente novamente mais tarde.';
  }
}
