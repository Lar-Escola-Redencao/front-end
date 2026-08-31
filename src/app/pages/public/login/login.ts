import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { Auth } from 'src/app/shared/services/auth/auth';

const SESSION_EXPIRED_TOAST_MS = 6000;

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
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    remember: new FormControl(false, { nonNullable: true }),
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password, remember } = this.form.getRawValue();

    this.loading.set(true);
    this.errorMessage.set(null);

    this.auth.login({ email, password }, remember).subscribe({
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
