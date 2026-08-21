import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Component({
  selector: 'app-placeholder-page',
  templateUrl: './placeholder-page.html',
  styleUrl: './placeholder-page.css',
})
export class PlaceholderPage {
  private readonly route = inject(ActivatedRoute);

  protected readonly title = toSignal(
    this.route.data.pipe(map((data) => (data['title'] as string) ?? 'Em desenvolvimento')),
    { initialValue: 'Em desenvolvimento' },
  );
}
