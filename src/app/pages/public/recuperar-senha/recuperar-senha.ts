import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { PublicNavbar } from '../../../components/public-navbar/public-navbar';
import { RecuperacaoSenhaService } from '../../../shared/services/auth/recuperacao-senha.service';

const PENALIDADES_SEGUNDOS = [60, 180, 600, 1800, 3600];
const STORAGE_KEY = 'ler_recovery_session';
const CODIGO_VALIDADE_MS = 15 * 60 * 1000;
const TEMPO_RESET_TENTATIVAS_MS = 2 * 60 * 60 * 1000;

interface EmailCooldown {
    solicitadoEm: number;
    tentativas: number;
    proximoEnvioLiberadoEm: number;
}

interface RecoveryStorage {
    emailAtivo: string | null;
    historico: Record<string, EmailCooldown>;
}

@Component({
    selector: 'app-recuperar-senha',
    standalone: true,
    imports: [RouterLink, ReactiveFormsModule, PublicNavbar],
    templateUrl: './recuperar-senha.html',
    styleUrl: './recuperar-senha.css'
})
export class RecuperarSenha implements OnInit, OnDestroy {
    private readonly recuperacaoService = inject(RecuperacaoSenhaService);
    private readonly toastr = inject(ToastrService);

    step = signal<1 | 2 | 3 | 4>(1);
    loading = signal(false);
    email = signal('');
    tempoEspera = signal(0);
    codigo = signal<string[]>(['', '', '', '', '', '']);
    avisoCodigoPendente = signal(false);

    private intervaloTimer: ReturnType<typeof setInterval> | undefined;

    formEmail = new FormGroup({
        email: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, Validators.email]
        })
    });

    formSenha = new FormGroup({
        novaSenha: new FormControl('', {
            nonNullable: true,
            validators: [
                Validators.required,
                Validators.pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{7,}$/)
            ]
        }),
        confirmarSenha: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required]
        })
    });

    mostrarSenha = signal(false);
    mostrarConfirmarSenha = signal(false);

    constructor() {
        this.formSenha.valueChanges.subscribe(() => {
            const pass = this.formSenha.controls.novaSenha.value;
            const conf = this.formSenha.controls.confirmarSenha.value;

            if (pass && conf && pass !== conf) {
                this.formSenha.controls.confirmarSenha.setErrors({ senhasDiferentes: true });
            } else if (this.formSenha.controls.confirmarSenha.hasError('senhasDiferentes')) {
                const errors = { ...this.formSenha.controls.confirmarSenha.errors };
                delete errors['senhasDiferentes'];
                this.formSenha.controls.confirmarSenha.setErrors(Object.keys(errors).length ? errors : null);
            }
        });
    }

    ngOnInit(): void {
        this.verificarSessaoAtiva();
    }

    ngOnDestroy(): void {
        if (this.intervaloTimer) clearInterval(this.intervaloTimer);
    }

    private codificarDado(dado: string): string {
        return btoa(encodeURIComponent(dado));
    }

    private decodificarDado(dado: string): string {
        try {
            return decodeURIComponent(atob(dado));
        } catch {
            return '';
        }
    }

    private lerStorage(): RecoveryStorage {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                return JSON.parse(raw) as RecoveryStorage;
            } catch {
                localStorage.removeItem(STORAGE_KEY);
            }
        }
        return { emailAtivo: null, historico: {} };
    }

    private salvarStorage(data: RecoveryStorage): void {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    private cooldownRestante(email: string): number {
        const storage = this.lerStorage();
        const chaveCodificada = this.codificarDado(email);
        const historico = storage.historico[chaveCodificada];
        if (!historico) return 0;
        return Math.max(0, Math.ceil((historico.proximoEnvioLiberadoEm - Date.now()) / 1000));
    }

    private codigoAindaValido(email: string): boolean {
        const storage = this.lerStorage();
        const chaveCodificada = this.codificarDado(email);
        const historico = storage.historico[chaveCodificada];
        if (!historico) return false;
        return Date.now() < historico.solicitadoEm + CODIGO_VALIDADE_MS;
    }

    private verificarSessaoAtiva(): void {
        const storage = this.lerStorage();
        if (!storage.emailAtivo) return;

        const email = this.decodificarDado(storage.emailAtivo);
        if (!email) {
            storage.emailAtivo = null;
            this.salvarStorage(storage);
            return;
        }

        if (!this.codigoAindaValido(email)) {
            storage.emailAtivo = null;
            this.salvarStorage(storage);
            return;
        }

        this.email.set(email);
        this.step.set(2);
        this.avisoCodigoPendente.set(true);

        const restante = this.cooldownRestante(email);
        this.tempoEspera.set(restante);
        if (restante > 0) this.iniciarContagem();
    }

    solicitarCodigo(): void {
        if (this.formEmail.invalid) {
            this.formEmail.markAllAsTouched();
            return;
        }

        const emailDigitado = this.formEmail.getRawValue().email.trim().toLowerCase();
        this.email.set(emailDigitado);

        const cooldown = this.cooldownRestante(emailDigitado);

        if (cooldown > 0) {
            const storage = this.lerStorage();
            storage.emailAtivo = this.codificarDado(emailDigitado);
            this.salvarStorage(storage);

            this.step.set(2);
            if (this.codigoAindaValido(emailDigitado)) {
                this.avisoCodigoPendente.set(true);
            }
            this.tempoEspera.set(cooldown);
            this.iniciarContagem();
            return;
        }

        this.processarEnvio(false);
    }

    voltarParaEmail(): void {
        this.formEmail.controls.email.setValue(this.email());
        this.avisoCodigoPendente.set(false);
        if (this.intervaloTimer) clearInterval(this.intervaloTimer);
        this.tempoEspera.set(0);
        this.step.set(1);
    }

    reenviarCodigo(): void {
        this.processarEnvio(true);
    }

    private processarEnvio(isReenvio: boolean): void {
        const emailDigitado = this.email();
        if (this.cooldownRestante(emailDigitado) > 0 || this.loading()) return;

        this.loading.set(true);

        this.recuperacaoService.solicitarRecuperacao(emailDigitado)
            .then(() => this.concluirProcessamentoEnvio(isReenvio, emailDigitado))
            .catch((err: any) => {
                if (err?.status === 429) {
                    this.toastr.warning('Aguarde um momento antes de solicitar um novo código.', 'Aviso');
                    this.avisoCodigoPendente.set(true);
                    this.step.set(2);
                    this.registrarPedido(emailDigitado);
                    return;
                }
                if (err?.status === 0) {
                    this.toastr.error('Não foi possível conectar ao servidor. Tente novamente.', 'Erro');
                    return;
                }
                this.concluirProcessamentoEnvio(isReenvio, emailDigitado);
            })
            .finally(() => this.loading.set(false));
    }

    private concluirProcessamentoEnvio(isReenvio: boolean, email: string): void {
        this.avisoCodigoPendente.set(false);
        this.step.set(2);
        this.toastr.success(
            isReenvio
                ? 'Código reenviado com sucesso.'
                : 'Se o e-mail constar na base, você receberá as instruções em breve.',
            'Sucesso'
        );
        this.registrarPedido(email);
    }

    private registrarPedido(email: string): void {
        const storage = this.lerStorage();
        const chaveCodificada = this.codificarDado(email);
        const historicoAnterior = storage.historico[chaveCodificada];

        let tentativas = 0;
        const agora = Date.now();

        if (historicoAnterior) {
            const tempoDesdeFimDoCooldown = agora - historicoAnterior.proximoEnvioLiberadoEm;
            const continuaMesmoCiclo = tempoDesdeFimDoCooldown < TEMPO_RESET_TENTATIVAS_MS;
            tentativas = continuaMesmoCiclo ? historicoAnterior.tentativas + 1 : 0;
        }

        const penalidade = PENALIDADES_SEGUNDOS[Math.min(tentativas, PENALIDADES_SEGUNDOS.length - 1)];

        storage.emailAtivo = chaveCodificada;
        storage.historico[chaveCodificada] = {
            solicitadoEm: agora,
            tentativas,
            proximoEnvioLiberadoEm: agora + penalidade * 1000
        };

        this.salvarStorage(storage);
        this.tempoEspera.set(penalidade);
        this.iniciarContagem();
    }

    async avancarParaSenha(): Promise<void> {
        this.loading.set(true);
        const tokenCompleto = this.codigo().join('');

        try {
            await this.recuperacaoService.validarCodigo(tokenCompleto);
            this.step.set(3);
        } catch (err: any) {
            this.toastr.error('Código inválido ou expirado.', 'Erro');
            this.codigo.set(['', '', '', '', '', '']);
            this.focusInput(0);
        } finally {
            this.loading.set(false);
        }
    }

    redefinirSenha(): void {
        if (this.formSenha.invalid) {
            this.formSenha.markAllAsTouched();
            return;
        }

        this.loading.set(true);
        const tokenCompleto = this.codigo().join('');
        const novaSenha = this.formSenha.getRawValue().novaSenha;

        this.recuperacaoService.redefinirSenha(tokenCompleto, novaSenha)
            .then(() => {
                this.step.set(4);
                localStorage.removeItem(STORAGE_KEY);
            })
            .catch((err: any) => {
                if (err?.status === 400 || err?.status === 403) {
                    this.toastr.error('Código inválido ou expirado.', 'Erro');
                    this.invalidarCodigoPendente();
                    this.codigo.set(['', '', '', '', '', '']);
                    this.step.set(2);
                    this.focusInput(0);
                } else {
                    this.toastr.error('Ocorreu um erro ao redefinir a senha.', 'Erro');
                }
            })
            .finally(() => this.loading.set(false));
    }

    private invalidarCodigoPendente(): void {
        const storage = this.lerStorage();
        const emailAtivoCodificado = storage.emailAtivo;
        if (emailAtivoCodificado && storage.historico[emailAtivoCodificado]) {
            storage.historico[emailAtivoCodificado].solicitadoEm = 0;
            this.salvarStorage(storage);
        }
    }

    private iniciarContagem(): void {
        if (this.intervaloTimer) clearInterval(this.intervaloTimer);
        this.intervaloTimer = setInterval(() => {
            this.tempoEspera.update(t => t - 1);
            if (this.tempoEspera() <= 0) clearInterval(this.intervaloTimer);
        }, 1000);
    }

    formatarTempo(): string {
        const tempo = this.tempoEspera();
        const m = Math.floor(tempo / 60);
        const s = tempo % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    tratarTecla(event: KeyboardEvent, index: number): void {
        if (event.ctrlKey || event.metaKey) return;

        if (event.key === 'Backspace') {
            if (!this.codigo()[index] && index > 0) {
                event.preventDefault();
                const novoCodigo = [...this.codigo()];
                novoCodigo[index - 1] = '';
                this.codigo.set(novoCodigo);
                this.focusInput(index - 1);
            }
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            if (index > 0) this.focusInput(index - 1);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            if (index < 5) this.focusInput(index + 1);
        }
    }

    tratarInput(event: Event, index: number): void {
        const input = event.target as HTMLInputElement;
        const rawVal = input.value;
        const cleanVal = rawVal.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const char = cleanVal.slice(-1);

        const novoCodigo = [...this.codigo()];
        novoCodigo[index] = char;
        this.codigo.set(novoCodigo);
        input.value = char;

        if (char && index < 5) {
            this.focusInput(index + 1);
        }
    }

    tratarColar(event: ClipboardEvent): void {
        event.preventDefault();
        const pasted = event.clipboardData?.getData('text') || '';
        const cleaned = pasted.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

        if (!cleaned) return;

        const novoCodigo = [...this.codigo()];
        for (let i = 0; i < 6; i++) {
            if (cleaned[i]) novoCodigo[i] = cleaned[i];
        }
        this.codigo.set(novoCodigo);

        const focusIndex = Math.min(cleaned.length, 5);
        this.focusInput(focusIndex);
    }

    codigoCompleto(): boolean {
        return this.codigo().join('').length === 6;
    }

    private focusInput(index: number): void {
        setTimeout(() => {
            const el = document.getElementById(`codigo-${index}`) as HTMLInputElement;
            if (el) {
                el.focus();
                el.select();
            }
        }, 0);
    }

    toggleSenha(): void {
        this.mostrarSenha.update(val => !val);
    }

    toggleConfirmarSenha(): void {
        this.mostrarConfirmarSenha.update(val => !val);
    }
}