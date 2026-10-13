import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-usuario-perfil-aba-placeholder',
  standalone: true,
  templateUrl: './aba-placeholder.html',
  styleUrl: './aba-placeholder.css'
})
export class UsuarioPerfilAbaPlaceholder {
  @Input() titulo = '';
  @Input() descricao = 'Essas informações serão organizadas aqui em breve.';
}
