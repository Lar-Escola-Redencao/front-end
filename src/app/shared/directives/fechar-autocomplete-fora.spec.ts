import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { FecharAutocompleteFora } from './fechar-autocomplete-fora';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';

@Component({
  imports: [MatAutocompleteModule, FecharAutocompleteFora],
  template: `
    <section (click)="$event.stopPropagation()">
      <input appFecharAutocompleteFora [matAutocomplete]="auto">
      <button type="button">Fechar modal</button>
    </section>
    <mat-autocomplete #auto="matAutocomplete">
      <mat-option value="Ana">Ana</mat-option>
    </mat-autocomplete>
  `
})
class FormularioTeste {}

describe('FecharAutocompleteFora', () => {
  it('fecha antes da ação do botão mesmo com propagação interrompida pelo modal', () => {
    const fixture = TestBed.createComponent(FormularioTeste);
    fixture.detectChanges();
    const input = fixture.debugElement.query(By.css('input'));
    const trigger = input.injector.get(MatAutocompleteTrigger);
    trigger.openPanel();
    fixture.detectChanges();
    expect(trigger.panelOpen).toBe(true);
    const aoAbrirAlerta = vi.fn(() => trigger.panelOpen);
    fixture.nativeElement.querySelector('button').addEventListener('click', aoAbrirAlerta);
    fixture.nativeElement.querySelector('button').click();
    expect(aoAbrirAlerta).toHaveBeenCalledOnce();
    expect(aoAbrirAlerta).toHaveReturnedWith(false);
    fixture.destroy();
  });

  it('mantém cliques no campo e permite selecionar uma sugestão', () => {
    const fixture = TestBed.createComponent(FormularioTeste);
    fixture.detectChanges();
    const input = fixture.debugElement.query(By.css('input'));
    const trigger = input.injector.get(MatAutocompleteTrigger);
    trigger.openPanel();
    fixture.detectChanges();
    input.nativeElement.click();
    expect(trigger.panelOpen).toBe(true);
    const selecionou = vi.fn();
    trigger.autocomplete.optionSelected.subscribe(selecionou);
    trigger.autocomplete.panel.nativeElement.querySelector('mat-option').click();
    expect(selecionou).toHaveBeenCalledOnce();
    expect(input.nativeElement.value).toBe('Ana');
    fixture.destroy();
  });
});
