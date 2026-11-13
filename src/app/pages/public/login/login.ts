import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, HostListener, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PublicFooter } from '@components/public-footer/public-footer';
import { ToastrService } from 'ngx-toastr';

import { PublicNavbar } from '@components/public-navbar/public-navbar';
import { Auth } from 'src/app/shared/services/auth/auth';
import { CaptchaPix } from '../../../shared/components/captcha-pix/captcha-pix';
import {
  formatarCpf,
  limparMascaraCpfSeVirouEmail,
  pareceEmail,
} from 'src/app/shared/utils/masks';

const SESSION_EXPIRED_TOAST_MS = 6000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  imports: [ReactiveFormsModule, PublicNavbar, PublicFooter, RouterLink, CaptchaPix],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastr = inject(ToastrService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showForgotHint = signal(false);
  protected readonly mostrarSenha = signal(false);
  protected readonly captchaObrigatorio = signal(false);
  protected readonly captchaToken = signal('');
  protected readonly tempoEspera = signal(0);
  @ViewChild(CaptchaPix) private captcha?: CaptchaPix;
  private bloqueadoAte = 0;
  private timer?: ReturnType<typeof setInterval>;

  private readonly queryParams = toSignal(this.route.queryParamMap);
  
  private readonly reasonParam = computed(() => this.queryParams()?.get('reason'));
  
  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.timer));
    effect((onCleanup) => {
      const reason = this.reasonParam();
      if (reason !== 'expired' && reason !== 'invalid') return;

      const mensagem = reason === 'invalid'
        ? 'Sua sessão não é mais válida. Entre novamente ou, se o acesso continuar bloqueado, contate a administração.'
        : 'Sua sessão expirou. Para sua segurança, entre novamente ou contate a administração se precisar de ajuda.';
      const aviso = this.toastr.warning(mensagem, 'Atenção', {
        positionClass: 'toast-top-right',
        timeOut: SESSION_EXPIRED_TOAST_MS,
        closeButton: true,
      });
      onCleanup(() => this.toastr.clear(aviso.toastId));
    });
  }

  protected alternarVisibilidadeSenha(): void {
    this.mostrarSenha.update((visivel) => !visivel);
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

  protected onIdentifierInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (pareceEmail(input.value)) {
      const limpo = limparMascaraCpfSeVirouEmail(input.value);
      if (limpo !== input.value) {
        this.form.controls.identifier.setValue(limpo, { emitEvent: false });
        input.value = limpo;
      }
      return;
    }

    const masked = formatarCpf(input.value);
    this.form.controls.identifier.setValue(masked, { emitEvent: false });
    input.value = masked;
  }

  protected submit(): void {
    this.atualizarEspera();
    if (this.loading() || this.tempoEspera() > 0) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.captchaObrigatorio() && !this.captchaToken()) {
      this.errorMessage.set('Conclua a verificação de segurança para entrar.');
      return;
    }

    const { identifier, password, remember } = this.form.getRawValue();
    const cleanedIdentifier = pareceEmail(identifier)
      ? identifier.trim()
      : identifier.replace(/\D/g, '');

    this.loading.set(true);
    this.errorMessage.set(null);

    const captchaToken = this.captchaToken();
    this.captchaToken.set('');
    this.auth.login({ identifier: cleanedIdentifier, password, ...(captchaToken ? { captchaToken } : {}) }, remember).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        if (error instanceof HttpErrorResponse) {
          if (error.error?.captchaRequired) this.captchaObrigatorio.set(true);
          const segundos = Number(error.error?.retryAfterSeconds ?? error.headers.get('Retry-After'));
          if (Number.isFinite(segundos) && segundos > 0) {
            this.bloqueadoAte = Date.now() + segundos * 1000;
            this.atualizarEspera();
            clearInterval(this.timer);
            this.timer = setInterval(() => this.atualizarEspera(), 1000);
          }
        }
        this.captcha?.resetar();
        this.errorMessage.set(this.resolveErrorMessage(error));
      },
    });
  }

  @HostListener('window:focus')
  protected atualizarEspera(): void {
    this.tempoEspera.set(Math.max(0, Math.ceil((this.bloqueadoAte - Date.now()) / 1000)));
    if (!this.tempoEspera()) clearInterval(this.timer);
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if ([400, 429, 503].includes(error.status) && typeof error.error?.message === 'string') {
        return error.error.message;
      }
      if (error.status === 401 || error.status === 400) {
        return 'E-mail, CPF ou senha inválidos.';
      }
      if (error.status === 0) {
        return 'Não foi possível conectar ao servidor. Tente novamente.';
      }
    }
    return 'Ocorreu um erro ao entrar. Tente novamente mais tarde.';
  }
}
