import { Injectable, signal } from '@angular/core';

export type DialogMode = 'alert' | 'confirm' | 'prompt';
export type DialogTone = 'success' | 'warning' | 'error' | 'info';

export interface DialogConfig {
  mode: DialogMode;
  tone: DialogTone;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  defaultValue: string;
  placeholder: string;
  autoCloseMs?: number;
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly dialog = signal<DialogConfig | null>(null);

  private resolver: ((value: string | boolean | null) => void) | null = null;
  private autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

  alert(
    message: string,
    title = 'Aviso',
    tone: DialogTone = 'info',
    autoCloseMs?: number
  ): Promise<boolean> {
    return this.open({
      mode: 'alert',
      tone,
      title,
      message,
      confirmText: 'Entendido',
      cancelText: 'Cancelar',
      defaultValue: '',
      placeholder: '',
      autoCloseMs
    }) as Promise<boolean>;
  }

  confirm(message: string, title = 'Confirmar', tone: DialogTone = 'warning'): Promise<boolean> {
    return this.open({
      mode: 'confirm',
      tone,
      title,
      message,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      defaultValue: '',
      placeholder: ''
    }) as Promise<boolean>;
  }

  prompt(
    message: string,
    title = 'Ingresa un valor',
    defaultValue = '',
    placeholder = ''
  ): Promise<string | null> {
    return this.open({
      mode: 'prompt',
      tone: 'info',
      title,
      message,
      confirmText: 'Aceptar',
      cancelText: 'Cancelar',
      defaultValue,
      placeholder
    }) as Promise<string | null>;
  }

  close(result: string | boolean | null): void {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }

    const resolver = this.resolver;
    this.resolver = null;
    this.dialog.set(null);
    resolver?.(result);
  }

  private open(config: DialogConfig): Promise<string | boolean | null> {
    if (this.resolver) {
      this.close(null);
    }

    return new Promise(resolve => {
      this.resolver = resolve;
      this.dialog.set(config);

      if (config.autoCloseMs) {
        this.autoCloseTimer = setTimeout(() => this.close(true), config.autoCloseMs);
      }
    });
  }
}
