import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter, Router } from '@angular/router';

import { PublicNavbar } from './public-navbar';

@Component({ template: '' })
class PaginaTeste {}

describe('PublicNavbar', () => {
  let component: PublicNavbar;
  let fixture: ComponentFixture<PublicNavbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicNavbar],
      providers: [provideRouter([{ path: '**', component: PaginaTeste }])],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicNavbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it.each(['/grafica', '/transparencia', '/como-ajudar', '/conheca-a-osc', '/eventos/2'])('destaca a página ao acessar %s', async url => {
    await TestBed.inject(Router).navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
    const links: NodeListOf<HTMLAnchorElement> = fixture.nativeElement.querySelectorAll('.nav-links .link-ativo');
    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toBe(url.startsWith('/eventos') ? '/eventos' : url);
    expect(links[0].getAttribute('aria-current')).toBe('page');
  });

  it('atualiza o destaque entre Início, Unidades e Parceiros ao navegar', async () => {
    const router = TestBed.inject(Router);
    for (const secao of ['inicio', 'unidades', 'parceiros', 'inicio']) {
      await router.navigate(['/'], { fragment: secao });
      fixture.detectChanges();
      await fixture.whenStable();
      const links: NodeListOf<HTMLAnchorElement> = fixture.nativeElement.querySelectorAll('.nav-links .link-ativo');
      expect(links.length).toBe(1);
      expect(links[0].getAttribute('href')).toBe('/#' + secao);
    }
  });
});
