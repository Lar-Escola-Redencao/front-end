import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subscription, switchMap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { UsuarioResponseDTO } from 'src/app/shared/models/usuario.model';
import { UsuarioService } from 'src/app/shared/services/usuario/usuario.service';
import { UsuarioPerfilAbaPlaceholder } from './components/aba-placeholder/aba-placeholder';
import { UsuarioPerfilDadosPessoais } from './components/dados-pessoais/dados-pessoais';
import { UsuarioPerfilDadosSocioeconomicos } from './components/dados-socioeconomicos/dados-socioeconomicos';
import { UsuarioPerfilSaude } from './components/saude/saude';

type AbaPerfil = 'contatos' | 'acompanhamento' | 'dados-pessoais' | 'saude' | 'dados-socioeconomicos' | 'matricula';

@Component({
  selector: 'app-usuario-perfil',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    UsuarioPerfilAbaPlaceholder,
    UsuarioPerfilDadosPessoais,
    UsuarioPerfilDadosSocioeconomicos,
    UsuarioPerfilSaude
  ],
  templateUrl: './usuario-perfil.html',
  styleUrl: './usuario-perfil.css',
})
export class UsuarioPerfil implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly usuarioService = inject(UsuarioService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private sub?: Subscription;

  usuario: UsuarioResponseDTO | null = null;
  carregando = true;
  erro = '';
  abaAtiva: AbaPerfil = 'dados-pessoais';

  readonly abas: { id: AbaPerfil; label: string }[] = [
    { id: 'contatos', label: 'Contatos' },
    { id: 'acompanhamento', label: 'Acompanhamento' },
    { id: 'dados-pessoais', label: 'Dados pessoais' },
    { id: 'saude', label: 'Saúde' },
    { id: 'dados-socioeconomicos', label: 'Dados socioeconômicos' },
    { id: 'matricula', label: 'Matrícula' }
  ];

  ngOnInit(): void {
    this.carregarPerfil();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  carregarPerfil(): void {
    this.sub?.unsubscribe();
    this.sub = this.route.paramMap.pipe(
      switchMap(params => {
        this.carregando = true;
        this.erro = '';
        this.atualizarTela();
        return this.usuarioService.buscarPorId(Number(params.get('id')));
      })
    ).subscribe({
      next: usuario => {
        this.ngZone.run(() => {
          this.usuario = usuario;
          this.carregando = false;
          this.atualizarTela();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.erro = 'Não foi possível carregar o perfil do usuário.';
          this.carregando = false;
          this.atualizarTela();
        });
      }
    });
  }

  selecionarAba(aba: AbaPerfil): void {
    this.abaAtiva = aba;
  }

  atualizarUsuario(usuario: UsuarioResponseDTO): void {
    this.usuario = usuario;
  }

  voltarParaUsuarios(): void {
    this.router.navigate(['/dashboard/usuarios']);
  }

  get fotoPerfil(): string | null {
    return this.obterUrlArquivo(this.usuario?.imagemPerfil);
  }

  get idade(): string {
    const anos = this.calcularIdade(this.usuario?.dataNascimento);
    if (anos === null) return 'Idade não informada';
    return `${anos.toString().padStart(2, '0')} anos (${this.formatarDataNascimentoCurta(this.usuario?.dataNascimento)})`;
  }

  get desde(): string {
    return this.usuario?.dataIngresso ? `Desde ${this.formatarMesAno(this.usuario.dataIngresso)}` : 'Desde não informado';
  }

  get turma(): string {
    return this.formatarTurma(this.usuario?.nomeTurma);
  }

  private calcularIdade(valor?: string | null): number | null {
    if (!valor) return null;
    const [ano, mes, dia] = valor.split('T')[0].split('-').map(Number);
    if (!ano || !mes || !dia) return null;

    const hoje = new Date();
    let idade = hoje.getFullYear() - ano;
    const aniversarioAindaNaoChegou = hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia);
    if (aniversarioAindaNaoChegou) idade--;
    return idade >= 0 ? idade : null;
  }

  private formatarMesAno(valor: string): string {
    const data = new Date(`${valor.split('T')[0]}T00:00:00`);
    if (Number.isNaN(data.getTime())) return 'não informado';
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(data);
  }

  private formatarDataNascimentoCurta(valor?: string | null): string {
    if (!valor) return 'não informada';
    const data = new Date(`${valor.split('T')[0]}T00:00:00`);
    if (Number.isNaN(data.getTime())) return 'não informada';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(data).replace(' de ', ' ').replace(' de ', ' ');
  }

  private formatarTurma(valor?: string | null): string {
    if (!valor) return 'Turma não informada';
    const normalizado = valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (normalizado.includes('MANHA')) return 'Manhã';
    if (normalizado.includes('TARDE')) return 'Tarde';
    return valor;
  }

  private obterUrlArquivo(valor?: string | null): string | null {
    if (!valor) return null;
    if (valor.startsWith('http://') || valor.startsWith('https://') || valor.startsWith('data:') || valor.startsWith('/images/')) {
      return valor;
    }
    return `${environment.apiUrl}${valor}`;
  }

  private atualizarTela(): void {
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }
}
