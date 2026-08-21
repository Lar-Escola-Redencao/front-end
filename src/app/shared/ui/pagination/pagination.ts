import { Component, computed, input, model } from '@angular/core';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.html',
  styleUrl: './pagination.css',
})
export class Pagination {
  readonly total = input.required<number>();
  readonly page = model.required<number>();
  readonly pageSize = model.required<number>();
  readonly pageSizeOptions = input<number[]>([5, 10, 20]);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );

  protected readonly rangeStart = computed(() =>
    this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1,
  );

  protected readonly rangeEnd = computed(() =>
    Math.min(this.page() * this.pageSize(), this.total()),
  );

  goToPrevious(): void {
    if (this.page() > 1) {
      this.page.set(this.page() - 1);
    }
  }

  goToNext(): void {
    if (this.page() < this.totalPages()) {
      this.page.set(this.page() + 1);
    }
  }

  onPageSizeChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.pageSize.set(value);
    this.page.set(1);
  }
}
