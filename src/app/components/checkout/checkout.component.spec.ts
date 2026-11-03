import { of } from 'rxjs';
import { CheckoutComponent } from './checkout.component';

describe('CheckoutComponent', () => {
  function createComponent(): CheckoutComponent {
    return new CheckoutComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { getCurrentOrder: () => of({ success: true, data: [] }) } as any,
      { isLoggedIn: () => true } as any,
      { getAllCategories: () => of({ success: true, data: [] }) } as any
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
      { isLoggedIn: () => true } as any,
      { getAllCategories: () => of({ success: true, data: [] }) } as any,
      { alert } as any
    );
    (component as any).orderId = 12;
    Object.assign(component.formData, {
      firstName: 'Ada', lastName: 'Lovelace', streetAddress: '1 Example Street',
      townCity: 'Montevideo', postcode: '11000'
    });
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
      { isLoggedIn: () => true } as any,
      { getAllCategories: () => of({ success: true, data: [] }) } as any,
      { alert } as any
    );
    (component as any).orderId = 12;
    Object.assign(component.formData, {
      firstName: 'Ada', lastName: 'Lovelace', streetAddress: '1 Example Street',
      townCity: 'Montevideo', postcode: '11000', country: 'UY'
    });
    component.cartItems.set([
      { id: 99, itemId: 99, name: 'Soap', price: 10, quantity: 1, category: 'Health' }
    ]);

    component.onPlaceOrder();

    expect(initiateCheckout).toHaveBeenCalledWith(12, {
      billingAddress: {
        fullName: 'Ada Lovelace',
        addressLine1: '1 Example Street',
        city: 'Montevideo',
        state: 'Montevideo',
        postalCode: '11000',
        country: 'UY'
      },
      paymentMethod: 'pending'
    });
    expect(alert).toHaveBeenCalledWith('Pedido enviado. El pago aún está pendiente.', 'Pedido iniciado', 'success');
    expect(component.isLoading()).toBeFalse();
  });
});