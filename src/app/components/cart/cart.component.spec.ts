import { of } from 'rxjs';
import { CartComponent } from './cart.component';

describe('CartComponent', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('applies and removes the checkout coupon in the cart summary', () => {
    const component = new CartComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { getCurrentOrder: () => ({ subscribe: () => undefined }) } as any,
      { isLoggedIn: () => true } as any
    );

    component['cartItems'].set([
      { id: 1, name: 'Soap', price: 100, quantity: 1, category: 'Health' }
    ]);
    component.activeCoupon.set('DISCOUNT10');

    expect(component.couponDiscount()).toBe(10);
    expect(component.tax()).toBe(7.2);
    expect(component.total()).toBe(97.2);

    component.onRemoveCoupon();

    expect(component.couponDiscount()).toBe(0);
    expect(component.total()).toBe(108);
  });

  it('includes the backend delivery cost in the cart summary', () => {
    const component = new CartComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { getCurrentOrder: () => of({
        success: true,
        data: [{
          id: 12,
          shippingCost: '15.50',
          total: 123.5,
          items: [{
            id: 1,
            quantity: 1,
            product: { id: 5, name: 'Soap', price: 100, category: 'Health' }
          }]
        }]
      }) } as any,
      { isLoggedIn: () => true } as any
    );

    component['loadCurrentOrder']();

    expect(component.deliveryCost()).toBe(15.5);
    expect(component.total()).toBe(123.5);
  });

  it('uses the backend-authoritative total from the current cart', () => {
    const component = new CartComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { getCurrentOrder: () => of({
        success: true,
        data: [{ id: 12, shippingCost: 8, total: 116, items: [] }]
      }) } as any,
      { isLoggedIn: () => true } as any
    );

    component['loadCurrentOrder']();

    expect(component.deliveryCost()).toBe(8);
    expect(component.total()).toBe(116);
  });

  it('reads shipping cost when the API returns one current order object', () => {
    const component = new CartComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { getCurrentOrder: () => of({
        success: true,
        data: {
          id: 12,
          shippingCost: 8,
          items: []
        }
      }) } as any,
      { isLoggedIn: () => true } as any
    );

    component['loadCurrentOrder']();

    expect(component.deliveryCost()).toBe(8);
  });

  it('refreshes an open cart to pick up database-driven delivery changes', () => {
    jest.useFakeTimers();
    const getCurrentOrder = jasmine.createSpy('getCurrentOrder').and.returnValue(of({
      success: true,
      data: [{ id: 12, shippingCost: 20, items: [] }]
    }));
    const component = new CartComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { getCurrentOrder } as any,
      { isLoggedIn: () => true } as any
    );

    component.ngOnInit();
    jest.advanceTimersByTime(5000);

    expect(getCurrentOrder).toHaveBeenCalledTimes(2);
    component.ngOnDestroy();
  });

  it('clears the delivery cost when the current order no longer exists', () => {
    const component = new CartComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { getCurrentOrder: () => of({ success: true, data: [] }) } as any,
      { isLoggedIn: () => true } as any
    );

    component['envio'].set(20);
    component['cartItems'].set([
      { id: 1, name: 'Soap', price: 100, quantity: 1, category: 'Health' }
    ]);
    component['processOrderResponse']({ success: true, data: [] });

    expect(component.deliveryCost()).toBe(0);
    expect(component.isEmpty()).toBeTrue();
  });

  it('should keep separate cart rows when multiple order items share the same product id', () => {
    const component = new CartComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { getCurrentOrder: () => ({ subscribe: () => undefined }) } as any,
      { isLoggedIn: () => true } as any
    );

    const orderItems = [
      {
        id: 101,
        quantity: 1,
        product: {
          id: 5,
          name: 'Same Product',
          price: 10,
          category: 'Accessories',
          image: '/vacuna.jpg'
        }
      },
      {
        id: 102,
        quantity: 2,
        product: {
          id: 5,
          name: 'Same Product',
          price: 10,
          category: 'Accessories',
          image: '/vacuna.jpg'
        }
      }
    ];

    const mappedItems = (component as any).mapOrderItemsToCartItems(orderItems);

    expect(mappedItems.length).toBe(2);
    expect(mappedItems[0].id).toBe(101);
    expect(mappedItems[1].id).toBe(102);
    expect(mappedItems[0].productId).toBe(5);
    expect(mappedItems[1].productId).toBe(5);
  });

  it('should decrement quantity from the minus button and keep the cart row', () => {
    const orderService = {
      addItemToOrder: jasmine.createSpy('addItemToOrder').and.returnValue(of({ success: true })),
      updateItemQuantity: jasmine.createSpy('updateItemQuantity').and.returnValue(of({ success: true })),
      deleteItemFromOrder: jasmine.createSpy('deleteItemFromOrder').and.returnValue(of({ success: true }))
    };

    const component = new CartComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      orderService as any,
      { isLoggedIn: () => true } as any
    );

    component['cartItems'].set([
      { id: 7, itemId: 99, productId: 5, name: 'Soap', price: 10, quantity: 2, category: 'Health' }
    ]);

    component.updateQuantity(7, -1);

    expect(orderService.updateItemQuantity).toHaveBeenCalledWith(99, 1);
    expect(component['cartItems']().length).toBe(1);
    expect(component['cartItems']()[0].quantity).toBe(1);
  });

  it('should remove the row when the X button is used', () => {
    const orderService = {
      updateItemQuantity: jasmine.createSpy('updateItemQuantity').and.returnValue(of({ success: true }))
    };

    const component = new CartComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      orderService as any,
      { isLoggedIn: () => true } as any
    );

    component['cartItems'].set([
      { id: 7, itemId: 99, productId: 5, name: 'Soap', price: 10, quantity: 1, category: 'Health' }
    ]);

    component.removeItem(7);

    expect(orderService.updateItemQuantity).toHaveBeenCalledWith(99, 0);
    expect(component['cartItems']().length).toBe(0);
  });

  it('keeps a successful quantity update when the next cart response is stale', () => {
    const component = new CartComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { getCurrentOrder: () => of({ success: true, data: [] }) } as any,
      { isLoggedIn: () => true } as any
    );
    const item = {
      id: 7,
      itemId: 99,
      productId: 5,
      name: 'Soap',
      price: 10,
      quantity: 2,
      category: 'Health'
    };

    component['cartItems'].set([item]);
    component['pendingQuantities'].set(99, 3);
    component['processOrderResponse']({
      success: true,
      data: [{ id: 12, shippingCost: 8, total: 32, items: [{ id: 99, quantity: 2, product: { id: 5, name: 'Soap', price: 10, category: 'Health' } }] }]
    });

    expect(component['cartItems']()[0].quantity).toBe(3);
    expect(component['pendingQuantities'].get(99)).toBe(3);

    component['processOrderResponse']({
      success: true,
      data: [{ id: 12, shippingCost: 8, total: 32, items: [{ id: 99, quantity: 3, product: { id: 5, name: 'Soap', price: 10, category: 'Health' } }] }]
    });

    expect(component['cartItems']()[0].quantity).toBe(3);
    expect(component['pendingQuantities'].has(99)).toBeFalse();
  });
});
