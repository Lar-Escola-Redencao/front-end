import { Component, ElementRef, input, output, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-image-dropzone',
  templateUrl: './image-dropzone.html',
  styleUrl: './image-dropzone.css',
})
export class ImageDropzone {
  readonly imageUrl = input<string | null>(null);
  readonly invalid = input(false);
  readonly imageSelected = output<string>();

  protected readonly isDraggingOver = signal(false);
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  openFilePicker(): void {
    this.fileInput().nativeElement.click();
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.readFile(file);
    }
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver.set(true);
  }

  onDragLeave(): void {
    this.isDraggingOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      this.readFile(file);
    }
  }

  private readFile(file: File): void {
    const reader = new FileReader();
    reader.onload = () => this.imageSelected.emit(reader.result as string);
    reader.readAsDataURL(file);
  }
}
