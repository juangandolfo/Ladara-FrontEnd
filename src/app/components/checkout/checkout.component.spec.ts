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
});