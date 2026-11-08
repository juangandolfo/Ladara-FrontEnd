import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { DialogService } from './dialog.service';

describe('DialogService', () => {
  let service: DialogService;

  beforeEach(() => {
    service = new DialogService();
  });

  it('creates alert, confirm, and prompt configurations with defaults and custom values', () => {
    void service.alert('Saved');
    expect(service.dialog()).toEqual({
      mode: 'alert', tone: 'info', title: 'Aviso', message: 'Saved',
      confirmText: 'Entendido', cancelText: 'Cancelar', defaultValue: '', placeholder: '', autoCloseMs: undefined
    });
    service.close(true);

    void service.confirm('Delete?', 'Remove', 'error');
    expect(service.dialog()).toEqual({
      mode: 'confirm', tone: 'error', title: 'Remove', message: 'Delete?',
      confirmText: 'Confirmar', cancelText: 'Cancelar', defaultValue: '', placeholder: ''
    });
    service.close(false);

    void service.prompt('Name?', 'Your name', 'Ada', 'Full name');
    expect(service.dialog()).toEqual({
      mode: 'prompt', tone: 'info', title: 'Your name', message: 'Name?',
      confirmText: 'Aceptar', cancelText: 'Cancelar', defaultValue: 'Ada', placeholder: 'Full name'
    });
    service.close(null);
  });

  it('resolves each supported close result and clears dialog state', async () => {
    const alert = service.alert('Notice');
    service.close(true);
    await expect(alert).resolves.toBe(true);
    expect(service.dialog()).toBeNull();

    const confirm = service.confirm('Continue?');
    service.close(false);
    await expect(confirm).resolves.toBe(false);

    const prompt = service.prompt('Value?');
    service.close('answer');
    await expect(prompt).resolves.toBe('answer');
    expect(service.dialog()).toBeNull();
  });

  it('resolves a pending dialog with null when another dialog replaces it', async () => {
    const first = service.confirm('First');
    const second = service.alert('Second');

    await expect(first).resolves.toBeNull();
    expect(service.dialog()?.message).toBe('Second');
    service.close(true);
    await expect(second).resolves.toBe(true);
  });

  it('auto-closes alerts and resolves true', fakeAsync(() => {
    let result: boolean | undefined;
    service.alert('Temporary', 'Notice', 'info', 200).then(value => result = value);

    tick(199);
    expect(result).toBeUndefined();
    tick(1);
    flushMicrotasks();
    expect(result).toBe(true);
    expect(service.dialog()).toBeNull();
  }));

  it('cancels the auto-close timer when closed manually', fakeAsync(() => {
    let result: boolean | undefined;
    service.alert('Temporary', 'Notice', 'info', 200).then(value => result = value);
    service.close(false);
    flushMicrotasks();
    tick(250);
    flushMicrotasks();

    expect(result).toBe(false);
    expect(service.dialog()).toBeNull();
  }));
});
