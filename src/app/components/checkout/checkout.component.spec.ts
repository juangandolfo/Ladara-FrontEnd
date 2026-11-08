import { of, Subject, throwError } from 'rxjs';
import { CheckoutComponent } from './checkout.component';

describe('CheckoutComponent', () => {
  const makeAddress = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    userId: 1,
    fullName: 'Ada Lovelace',
    addressLine1: '12 Main Street',
    city: 'Montevideo',
    postalCode: '11000',
    country: 'UY',
    createdAt: '2026-01-01',
    ...overrides
  });

  function createComponent(): CheckoutComponent {
    return new CheckoutComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { getCurrentOrder: () => of({ success: true, data: [] }) } as any,
      { alert: jasmine.createSpy('alert'), confirm: jasmine.createSpy('confirm') } as any,
      { list: () => of({ success: true, data: [] }) } as any
    );
  }

  function createComponentWith(orderService: any = {}, dialogService: any = {}, billingService: any = {}): CheckoutComponent {
    return new CheckoutComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { getCurrentOrder: () => of({ success: true, data: [] }), ...orderService } as any,
      { alert: jasmine.createSpy('alert'), confirm: jasmine.createSpy('confirm'), prompt: jasmine.createSpy('prompt'), ...dialogService } as any,
      { list: () => of({ success: true, data: [] }), create: jasmine.createSpy('create'), update: jasmine.createSpy('update'), delete: jasmine.createSpy('delete'), ...billingService } as any
    );
  }

  it('calculates discounted subtotal, coupon discount, tax, and total', () => {
    const component = createComponent();
    component.cartItems.set([
      { id: 1, name: 'Soap', price: 20, discountedPrice: 10, quantity: 2, category: 'Health' },
      { id: 2, name: 'Mask', price: 5, quantity: 1, category: 'Health' }
    ]);
    expect(component.orderSummary()).toEqual(jasmine.objectContaining({
      subtotal: 25,
      discount: 2.5,
      tax: 1.8,
      total: 24.3
    }));
  });

  it('accepts only the supported coupon and supports removing it', () => {
    const component = createComponent();
    expect(component.validateCouponCode('DISCOUNT10')).toBeTrue();
    expect(component.validateCouponCode('discount10')).toBeFalse();
    component.onRemoveCoupon();
    expect(component.orderSummary().discount).toBe(0);
  });

  it('navigates home and to the cart', () => {
    const router = { navigate: jasmine.createSpy('navigate') };
    const component = new CheckoutComponent(router as any, {} as any, {} as any, {} as any);
    component.goHome();
    component.goToCart();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(router.navigate).toHaveBeenCalledWith(['/carrito']);
  });

  it('FE-ACT-06 blocks checkout and highlights items rejected by backend validation', () => {
    const validateCurrentOrder = jasmine.createSpy('validateCurrentOrder').and.returnValue(of({
      success: true,
      data: {
        valid: false,
        rejectedItems: [{ itemId: 99, reason: 'OUT_OF_STOCK', message: 'Stock insuficiente' }]
      }
    }));
    const initiateCheckout = jasmine.createSpy('initiateCheckout');
    const alert = jasmine.createSpy('alert').and.returnValue(Promise.resolve(true));
    const component = new CheckoutComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { validateCurrentOrder, initiateCheckout } as any,
      { alert, confirm: jasmine.createSpy('confirm') } as any,
      { list: () => of({ success: true, data: [] }) } as any
    );
    (component as any).orderId = 12;
    component.billingAddresses.set([{ id: 5, fullName: 'Ada Lovelace' } as any]);
    component.selectedBillingInformationId.set(5);
    component.cartItems.set([
      { id: 99, itemId: 99, name: 'Soap', price: 10, quantity: 1, category: 'Health' }
    ]);

    component.onPlaceOrder();

    expect(validateCurrentOrder).toHaveBeenCalledWith(12);
    expect(initiateCheckout).not.toHaveBeenCalled();
    expect(component.rejectedItemIds()).toEqual([99]);
    expect(component.error()).toContain('Stock insuficiente');
    expect(alert).not.toHaveBeenCalled();
  });

  it('submits checkout after successful order validation', () => {
    const validateCurrentOrder = jasmine.createSpy('validateCurrentOrder').and.returnValue(of({
      success: true,
      data: { valid: true, rejectedItems: [] }
    }));
    const initiateCheckout = jasmine.createSpy('initiateCheckout').and.returnValue(of({
      success: true,
      message: 'Checkout details saved; payment has not been processed'
    }));
    const alert = jasmine.createSpy('alert').and.returnValue(Promise.resolve(true));
    const component = new CheckoutComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { validateCurrentOrder, initiateCheckout } as any,
      { alert, confirm: jasmine.createSpy('confirm') } as any,
      { list: () => of({ success: true, data: [] }) } as any
    );
    (component as any).orderId = 12;
    component.billingAddresses.set([{ id: 5, fullName: 'Ada Lovelace' } as any]);
    component.selectedBillingInformationId.set(5);
    component.paymentMethod = 'cash';
    component.cartItems.set([
      { id: 99, itemId: 99, name: 'Soap', price: 10, quantity: 1, category: 'Health' }
    ]);

    component.onPlaceOrder();

    expect(initiateCheckout).toHaveBeenCalledWith(12, {
      billingInformationId: 5,
      paymentMethod: 'cash'
    });
    expect(alert).toHaveBeenCalledWith('Pedido enviado. El pago aún está pendiente.', 'Pedido iniciado', 'success');
    expect(component.isLoading()).toBeFalse();
  });

  it('loads an object order and normalizes optional product data', () => {
    const component = createComponentWith({
      getCurrentOrder: jasmine.createSpy().and.returnValue(of({
        success: true,
        data: { id: '18', items: [{ id: 7, quantity: '2', price: '9' }, { id: 8, product: { id: 3, name: 'Mask', price: 4, stock: 6 }, quantity: 1 }] }
      }))
    });

    component.ngOnInit();

    expect(component.cartItems()).toEqual([
      jasmine.objectContaining({ id: 7, itemId: 7, name: 'Producto', price: 9, quantity: 2, category: '' }),
      jasmine.objectContaining({ id: 8, productId: 3, name: 'Mask', price: 4, quantity: 1 })
    ]);
    expect(component.isLoading()).toBeFalse();
    expect(component.selectedBillingInformationId()).toBeNull();
  });

  it('takes the first order from an array and handles an order-loading error', () => {
    const first = createComponentWith({
      getCurrentOrder: () => of({ data: [{ id: 21, items: [] }] })
    });
    first.ngOnInit();
    expect(first['orderId']).toBe(21);

    const second = createComponentWith({ getCurrentOrder: () => throwError(() => new Error('offline')) });
    second.ngOnInit();
    expect(second.error()).toBe('No se pudo cargar el carrito para el pago.');
    expect(second.isLoading()).toBeFalse();
  });

  it('loads addresses, preserves a valid selection, and selects the first after reload', () => {
    const addresses = [makeAddress(1), makeAddress(2)];
    let listCall = 0;
    const list = () => listCall++ === 0
      ? of({ success: true, data: addresses })
      : of({ success: true, data: [addresses[1]] });
    const component = createComponentWith({}, {}, { list });
    component.selectedBillingInformationId.set(2);

    component.reloadBillingAddresses();
    expect(component.selectedBillingInformationId()).toBe(2);
    expect(component.isLoadingAddresses()).toBeFalse();

    component.selectedBillingInformationId.set(1);
    component.reloadBillingAddresses();
    expect(component.selectedBillingInformationId()).toBe(2);
  });

  it('handles empty, malformed, and failed address loads', () => {
    let listCall = 0;
    const list = () => {
      const responses = [
        of({ success: true, data: [] }),
        of({ success: true, data: 'invalid' }),
        throwError(() => ({ error: { message: 'Address service unavailable' } }))
      ];
      return responses[listCall++];
    };
    const component = createComponentWith({}, {}, { list });

    component.reloadBillingAddresses();
    expect(component.isAddressFormVisible()).toBeTrue();
    expect(component.selectedBillingInformationId()).toBeNull();
    component.reloadBillingAddresses();
    expect(component.addressError()).toBe('No se pudieron cargar tus direcciones.');
    component.reloadBillingAddresses();
    expect(component.addressError()).toBe('Address service unavailable');
    expect(component.isLoadingAddresses()).toBeFalse();
  });

  it('trims accepted coupon input and leaves it unchanged on cancel or blank input', async () => {
    let promptCall = 0;
    const prompt = () => [Promise.resolve(' SAVE5 '), Promise.resolve(null), Promise.resolve('   ')][promptCall++];
    const component = createComponentWith({}, { prompt });

    component.onCouponClick();
    await Promise.resolve();
    expect(component.activeCoupon()).toBe('SAVE5');
    component.onCouponClick();
    await Promise.resolve();
    expect(component.activeCoupon()).toBe('SAVE5');
    component.onCouponClick();
    await Promise.resolve();
    expect(component.activeCoupon()).toBe('');
  });

  it('uses the regular price when a discount is zero and floors taxable amount at zero', () => {
    const component = createComponent();
    component.cartItems.set([
      { id: 1, name: 'Item', price: 10, discountedPrice: 0, quantity: 1, category: '' },
      { id: 2, name: 'Free', price: 1, discountedPrice: -5, quantity: 1, category: '' }
    ]);
    expect(component.orderSummary().items.map(item => item.price)).toEqual([10, 1]);
    component.cartItems.set([]);
    expect(component.orderSummary()).toEqual(jasmine.objectContaining({ subtotal: 0, discount: 0, tax: 0, total: 0 }));
  });

  it('resets, safely maps, and cancels address forms', () => {
    const component = createComponent();
    component.addressForm.fullName = 'Stale value';
    component.openNewAddressForm();
    expect(component.addressForm.fullName).toBe('');
    expect(component.addressForm.country).toBe('UY');

    component.editAddress(makeAddress(5, { company: undefined, addressLine2: undefined, state: undefined, phone: undefined }) as any);
    expect(component.editingAddressId()).toBe(5);
    expect(component.addressForm).toEqual(jasmine.objectContaining({ company: '', addressLine2: '', state: '', phone: '' }));
    component.cancelAddressForm();
    expect(component.isAddressFormVisible()).toBeFalse();
    expect(component.editingAddressId()).toBeNull();
    expect(component.addressForm.fullName).toBe('');
  });

  it('validates required address fields and normalizes create input on success', () => {
    const saved = makeAddress(9);
    const create = jasmine.createSpy('create').and.returnValue(of({ success: true, data: saved }));
    const component = createComponentWith({}, {}, { create });
    component.saveAddress();
    expect(create).not.toHaveBeenCalled();
    expect(component.addressError()).toBe('Completa los campos obligatorios de la dirección.');

    component.addressForm = {
      fullName: ' Ada ', company: '  ', addressLine1: ' 12 Main ', addressLine2: ' Apt 2 ',
      city: ' Montevideo ', state: '  ', postalCode: ' 11000 ', country: ' UY ', phone: '  '
    };
    component.saveAddress();

    expect(create).toHaveBeenCalledWith({
      fullName: 'Ada', addressLine1: '12 Main', city: 'Montevideo', postalCode: '11000', country: 'UY',
      company: undefined, addressLine2: 'Apt 2', state: undefined, phone: undefined
    });
    expect(component.billingAddresses()).toEqual([saved]);
    expect(component.selectedBillingInformationId()).toBe(9);
    expect(component.isAddressFormVisible()).toBeFalse();
    expect(component.isSavingAddress()).toBeFalse();
  });

  it('updates addresses and exposes unsuccessful, missing-data, and transport save errors', () => {
    let updateCall = 0;
    const update = () => [
      of({ success: true, data: makeAddress(4, { fullName: 'Updated' }) }),
      of({ success: false, message: 'Update rejected' }),
      of({ success: true }),
      throwError(() => ({ error: { message: 'Network issue' } }))
    ][updateCall++];
    const component = createComponentWith({}, {}, { update });
    component.billingAddresses.set([makeAddress(4) as any]);
    component.editAddress(makeAddress(4) as any);
    component.saveAddress();
    expect(component.billingAddresses()[0].fullName).toBe('Updated');

    component.editAddress(makeAddress(4) as any);
    component.saveAddress();
    expect(component.addressError()).toBe('Update rejected');
    component.saveAddress();
    expect(component.addressError()).toBe('No se pudo guardar la dirección. Intenta nuevamente.');
    component.saveAddress();
    expect(component.addressError()).toBe('Network issue');
    expect(component.isSavingAddress()).toBeFalse();
  });

  it('does not send duplicate address saves while the request is pending', () => {
    const pending = new Subject<any>();
    const create = jasmine.createSpy('create').and.returnValue(pending);
    const component = createComponentWith({}, {}, { create });
    component.addressForm = {
      fullName: 'Ada', addressLine1: '12 Main', city: 'Montevideo', postalCode: '11000', country: 'UY'
    };
    component.saveAddress();
    component.saveAddress();
    expect(create).toHaveBeenCalledTimes(1);
    pending.next({ success: false, message: 'No' });
    pending.complete();
  });

  it('cancels address deletion without an API call and selects a remaining address after deletion', async () => {
    let confirmCall = 0;
    const confirm = () => [Promise.resolve(false), Promise.resolve(true)][confirmCall++];
    const deleteAddress = jasmine.createSpy('delete').and.returnValue(of({ success: true }));
    const component = createComponentWith({}, { confirm }, { delete: deleteAddress });
    const addresses = [makeAddress(1), makeAddress(2)];
    component.billingAddresses.set(addresses as any);
    component.selectedBillingInformationId.set(1);

    await component.deleteAddress(addresses[0] as any);
    expect(deleteAddress).not.toHaveBeenCalled();
    await component.deleteAddress(addresses[0] as any);
    expect(deleteAddress).toHaveBeenCalledWith(1);
    expect(component.billingAddresses().map(address => address.id)).toEqual([2]);
    expect(component.selectedBillingInformationId()).toBe(2);
  });

  it('opens the address form after deleting the last address and reports delete failures', async () => {
    const confirm = jasmine.createSpy('confirm').and.returnValue(Promise.resolve(true));
    let deleteCall = 0;
    const deleteAddress = () => [
      of({ success: true }),
      of({ success: false, message: 'Delete rejected' }),
      throwError(() => ({ status: 409 })),
      throwError(() => ({ error: { message: 'Delete unavailable' } }))
    ][deleteCall++];
    const component = createComponentWith({}, { confirm }, { delete: deleteAddress });
    const address = makeAddress(7);
    component.billingAddresses.set([address] as any);
    component.selectedBillingInformationId.set(7);

    await component.deleteAddress(address as any);
    expect(component.isAddressFormVisible()).toBeTrue();
    expect(component.selectedBillingInformationId()).toBeNull();
    await component.deleteAddress(address as any);
    expect(component.addressError()).toBe('Delete rejected');
    await component.deleteAddress(address as any);
    expect(component.addressError()).toContain('vinculada');
    await component.deleteAddress(address as any);
    expect(component.addressError()).toBe('Delete unavailable');
  });

  it('blocks checkout for empty carts, invalid addresses, missing order IDs, and concurrent requests', () => {
    const alert = jasmine.createSpy('alert');
    const validate = jasmine.createSpy('validateCurrentOrder');
    const component = createComponentWith({ validateCurrentOrder: validate }, { alert });
    component.onPlaceOrder();
    expect(alert).toHaveBeenCalledWith('Tu carrito está vacío.', 'Carrito vacío', 'warning');

    component.cartItems.set([{ id: 1, name: 'Soap', price: 10, quantity: 1, category: '' }]);
    component.onPlaceOrder();
    expect(component.error()).toContain('dirección de facturación');
    component.billingAddresses.set([makeAddress(4) as any]);
    component.selectedBillingInformationId.set(4);
    component.onPlaceOrder();
    expect(component.error()).toContain('validar el pedido');
    (component as any).orderId = 2;
    component.isLoading.set(true);
    component.onPlaceOrder();
    expect(validate).not.toHaveBeenCalled();
  });

  it('resets checkout loading and exposes validation and checkout failures', () => {
    const validationError = createComponentWith({
      validateCurrentOrder: () => throwError(() => new Error('offline'))
    });
    (validationError as any).orderId = 2;
    validationError.cartItems.set([{ id: 1, name: 'Soap', price: 10, quantity: 1, category: '' }]);
    validationError.billingAddresses.set([makeAddress(4) as any]);
    validationError.selectedBillingInformationId.set(4);
    validationError.onPlaceOrder();
    expect(validationError.error()).toContain('validar el pedido con el servidor');
    expect(validationError.isLoading()).toBeFalse();

    const checkoutFailure = createComponentWith({
      validateCurrentOrder: () => of({ success: true, data: { valid: true } }),
      initiateCheckout: () => of({ success: false, message: 'Checkout rejected' })
    });
    (checkoutFailure as any).orderId = 2;
    checkoutFailure.cartItems.set([{ id: 1, name: 'Soap', price: 10, quantity: 1, category: '' }]);
    checkoutFailure.billingAddresses.set([makeAddress(4) as any]);
    checkoutFailure.selectedBillingInformationId.set(4);
    checkoutFailure.onPlaceOrder();
    expect(checkoutFailure.error()).toBe('Checkout rejected');
    expect(checkoutFailure.isLoading()).toBeFalse();

    const checkoutError = createComponentWith({
      validateCurrentOrder: () => of({ success: true, data: { valid: true } }),
      initiateCheckout: () => throwError(() => ({ error: { message: 'Payment service unavailable' } }))
    });
    (checkoutError as any).orderId = 2;
    checkoutError.cartItems.set([{ id: 1, name: 'Soap', price: 10, quantity: 1, category: '' }]);
    checkoutError.billingAddresses.set([makeAddress(4) as any]);
    checkoutError.selectedBillingInformationId.set(4);
    checkoutError.onPlaceOrder();
    expect(checkoutError.error()).toBe('Payment service unavailable');
    expect(checkoutError.isLoading()).toBeFalse();
  });

  it('unsubscribes pending order and address work when destroyed', () => {
    const order = new Subject<any>();
    const addresses = new Subject<any>();
    const component = createComponentWith({ getCurrentOrder: () => order }, {}, { list: () => addresses });
    component.ngOnInit();
    component.ngOnDestroy();
    order.next({ success: true, data: { id: 3, items: [] } });
    addresses.next({ success: true, data: [makeAddress(1)] });
    expect(component.cartItems()).toEqual([]);
    expect(component.billingAddresses()).toEqual([]);
  });
});