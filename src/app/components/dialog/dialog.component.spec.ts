import { DialogComponent } from './dialog.component';
import { DialogService } from '../../services/dialog.service';

describe('DialogComponent', () => {
  let dialogService: DialogService;
  let component: DialogComponent;

  beforeEach(() => {
    dialogService = new DialogService();
    component = new DialogComponent(dialogService);
  });

  afterEach(() => dialogService.close(null));

  it('dismisses an open dialog on Escape and leaves no-dialog state unchanged', () => {
    component.closeOnEscape();
    expect(dialogService.dialog()).toBeNull();

    void dialogService.confirm('Continue?');
    component.closeOnEscape();
    expect(dialogService.dialog()).toBeNull();
  });

  it('dismisses only backdrop clicks, not clicks inside the dialog', () => {
    void dialogService.confirm('Continue?');
    const backdrop = {} as EventTarget;
    const insideDialog = {} as EventTarget;

    component.closeOnBackdrop({ target: insideDialog, currentTarget: backdrop } as MouseEvent);
    expect(dialogService.dialog()).not.toBeNull();

    component.closeOnBackdrop({ target: backdrop, currentTarget: backdrop } as MouseEvent);
    expect(dialogService.dialog()).toBeNull();
  });

  it('confirms and cancels alert and confirm dialogs', async () => {
    const confirmation = dialogService.confirm('Continue?');
    component.confirm();
    await expect(confirmation).resolves.toBe(true);

    const cancellation = dialogService.confirm('Continue?');
    component.cancel();
    await expect(cancellation).resolves.toBeNull();

    const alert = dialogService.alert('Notice');
    component.confirm();
    await expect(alert).resolves.toBe(true);
  });

  it('submits prompt text or its default value when empty', async () => {
    const enteredValue = dialogService.prompt('Name?', 'Your name', 'Ada');
    component.promptValue = 'Grace';
    component.confirm();
    await expect(enteredValue).resolves.toBe('Grace');

    const defaultValue = dialogService.prompt('Name?', 'Your name', 'Ada');
    component.promptValue = '';
    component.confirm();
    await expect(defaultValue).resolves.toBe('Ada');
  });
});
