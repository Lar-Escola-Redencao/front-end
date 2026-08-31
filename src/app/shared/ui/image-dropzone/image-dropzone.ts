import { Component, ElementRef, input, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-image-dropzone',
  templateUrl: './image-dropzone.html',
  styleUrl: './image-dropzone.css',
})
export class ImageDropzone {
  readonly imageUrl = input<string | null>(null);
  readonly invalid = input(false);
  readonly fileSelected = output<File>();

  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  openFilePicker(): void {
    this.fileInput().nativeElement.click();
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.fileSelected.emit(file);
    }
    input.value = '';
  }
}
