import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogService } from '../../services/dialog.service';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.css'
})
export class DialogComponent {
  promptValue = '';

  constructor(readonly dialogService: DialogService) {}

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    if (this.dialogService.dialog()) {
      this.dialogService.close(null);
    }
  }

  closeOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.dialogService.close(null);
    }
  }

  confirm(): void {
    const dialog = this.dialogService.dialog();
    if (dialog?.mode === 'prompt') {
      this.dialogService.close(this.promptValue || dialog.defaultValue);
      return;
    }

    this.dialogService.close(true);
  }

  cancel(): void {
    this.dialogService.close(null);
  }
}
