import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ToastrService } from 'ngx-toastr';
import { UsuarioResponseDTO } from 'src/app/shared/models/usuario.model';
import { UsuarioService } from 'src/app/shared/services/usuario/usuario.service';
import { CepService } from 'src/app/shared/services/usuario/cep.service';
import { UsuarioPerfilDadosPessoais } from './dados-pessoais';

describe('Documentos ao editar os dados pessoais', () => {
  const usuario: UsuarioResponseDTO = {
    id: 1,
    nomeCompleto: 'Arthur Silva Gomes',
    dataNascimento: '2015-05-10',
    cpf: '52998224725',
    documentoAuxiliar: 'CERTIDAO-123',
    tipoDocumento: 'CERTIDAO_NASCIMENTO',
    endereco: 'Rua de teste',
    bairro: 'Centro',
    escola: 'Escola de teste',
    periodoEscolar: 'MANHA',
    serieEscolar: 'SERIE_4',
    idTurma: 1,
    contatos: [{ id: 1, nomeCompleto: 'Responsável', telefone: '16999991111', principal: true }]
  };
  let component: UsuarioPerfilDadosPessoais;
  let atualizar: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    atualizar = vi.fn(() => of(usuario));
    TestBed.configureTestingModule({
      providers: [
        { provide: UsuarioService, useValue: { atualizar } },
        { provide: CepService, useValue: { consultar: vi.fn() } },
        { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn() } }
      ]
    });
    TestBed.overrideComponent(UsuarioPerfilDadosPessoais, { set: { template: '' } });
    const fixture = TestBed.createComponent(UsuarioPerfilDadosPessoais);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('usuario', usuario);
    fixture.detectChanges();
  });

  it.each([
    { cpf: usuario.cpf, documentoAuxiliar: usuario.documentoAuxiliar, tipoDocumento: usuario.tipoDocumento },
    { cpf: usuario.cpf, documentoAuxiliar: undefined, tipoDocumento: undefined },
    { cpf: undefined, documentoAuxiliar: usuario.documentoAuxiliar, tipoDocumento: usuario.tipoDocumento }
  ])('preserva os documentos existentes ao alterar somente o nome: %j', documentos => {
    component.usuario = { ...usuario, ...documentos };
    component.ngOnChanges({ usuario: {} as any });
    expect(component.usaOutroDocumento).toBe(!documentos.cpf);
    component.editar();
    component.form.controls.nomeCompleto.setValue('Arthur Silva GomesAL');
    component.salvar();

    expect(atualizar).toHaveBeenCalledOnce();
    expect(atualizar.mock.calls[0][1]).toMatchObject({
      nomeCompleto: 'Arthur Silva GomesAL',
      cpf: documentos.cpf ?? null,
      documentoAuxiliar: documentos.documentoAuxiliar ?? null,
      tipoDocumento: documentos.tipoDocumento ?? null
    });
  });

  it('remove o CPF somente quando a pessoa escolhe o documento auxiliar', () => {
    component.editar();
    component.form.controls.usarOutroDocumento.setValue(true);
    component.salvar();

    expect(atualizar.mock.calls[0][1]).toMatchObject({
      cpf: null,
      documentoAuxiliar: usuario.documentoAuxiliar,
      tipoDocumento: usuario.tipoDocumento
    });
  });

  it('permite trocar explicitamente o documento auxiliar por CPF', () => {
    component.usuario = { ...usuario, cpf: undefined };
    component.ngOnChanges({ usuario: {} as any });
    component.editar();
    component.form.patchValue({ usarOutroDocumento: false, cpf: '529.982.247-25' });
    component.salvar();

    expect(atualizar.mock.calls[0][1]).toMatchObject({
      cpf: '52998224725', documentoAuxiliar: null, tipoDocumento: null
    });
  });
});
