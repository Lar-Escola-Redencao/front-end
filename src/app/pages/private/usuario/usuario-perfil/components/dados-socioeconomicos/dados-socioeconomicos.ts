import { Component, Input } from '@angular/core';
import { UsuarioResponseDTO } from 'src/app/shared/models/usuario.model';

@Component({
  selector: 'app-usuario-perfil-dados-socioeconomicos',
  standalone: true,
  templateUrl: './dados-socioeconomicos.html',
  styleUrl: './dados-socioeconomicos.css'
})
export class UsuarioPerfilDadosSocioeconomicos {
  @Input() usuario: UsuarioResponseDTO | null = null;
}
