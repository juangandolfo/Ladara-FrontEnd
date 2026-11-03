import { NEVER, of, Subject } from 'rxjs';
import { CartComponent } from './cart.component';

describe('CartComponent', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('FE-ACT-05 applies and removes the recognized coupon in the cart summary', () => {
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

  it('clears the cart through the dedicated current-cart operation', () => {
    const clearCurrentCart = jasmine.createSpy('clearCurrentCart').and.returnValue(of({ success: true }));
    const updateItemQuantity = jasmine.createSpy('updateItemQuantity').and.returnValue(of({ success: true }));
    const component = new CartComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { clearCurrentCart, updateItemQuantity } as any,
      { isLoggedIn: () => true } as any
    );
    component.cartItems.set([
      { id: 7, itemId: 99, name: 'Soap', price: 10, quantity: 1, category: 'Health' }
    ]);

    component.clearCart();

    expect(clearCurrentCart).toHaveBeenCalledTimes(1);
    expect(updateItemQuantity).not.toHaveBeenCalled();
    expect(component.isEmpty()).toBeTrue();
  });

  it('should remove the row when the X button is used', () => {
    jest.useFakeTimers();
    const orderService = {
      updateItemQuantity: jasmine.createSpy('updateItemQuantity').and.returnValue(of({ success: true })),
      getCurrentOrder: () => NEVER
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
    jest.advanceTimersByTime(250);

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

  describe('Frontend agent acceptance coverage', () => {
    it('FE-ACT-02 shows loading while the cart is fetched, then computes its summary', () => {
      const response = new Subject<any>();
      const component = new CartComponent(
        { navigate: jasmine.createSpy('navigate') } as any,
        { getCurrentOrder: () => response } as any,
        { isLoggedIn: () => true } as any,
        {} as any
      );

      component['loadCurrentOrder']();
      expect(component.isLoading()).toBeTrue();

      response.next({
        success: true,
        data: [{
          id: 12,
          shippingCost: 8,
          total: 51.84,
          items: [{
            id: 99,
            quantity: 2,
            product: { id: 5, name: 'Soap', price: 20, category: 'Health' }
          }]
        }]
      });

      expect(component.isLoading()).toBeFalse();
      expect(component.totalItems()).toBe(2);
      expect(component.subtotal()).toBe(40);
      expect(component.deliveryCost()).toBe(8);
      expect(component.total()).toBe(51.84);
    });

    it('FE-ACT-03 updates quantity, line-derived subtotal, and unit count optimistically', () => {
      const updateItemQuantity = jasmine.createSpy('updateItemQuantity').and.returnValue(of({ success: true }));
      const component = new CartComponent(
        { navigate: jasmine.createSpy('navigate') } as any,
        { updateItemQuantity, getCurrentOrder: () => NEVER } as any,
        { isLoggedIn: () => true } as any,
        {} as any
      );
      component['cartItems'].set([
        { id: 7, itemId: 99, name: 'Soap', price: 10, quantity: 2, category: 'Health' }
      ]);

      component.updateQuantity(7, 1);

      expect(updateItemQuantity).toHaveBeenCalledWith(99, 3);
      expect(component.cartItems()[0].quantity).toBe(3);
      expect(component.subtotal()).toBe(30);
      expect(component.totalItems()).toBe(3);
    });

    it('FE-ACT-04 removes an item optimistically and produces an empty cart state', () => {
      jest.useFakeTimers();
      const updateItemQuantity = jasmine.createSpy('updateItemQuantity').and.returnValue(of({ success: true }));
      const component = new CartComponent(
        { navigate: jasmine.createSpy('navigate') } as any,
        { updateItemQuantity, getCurrentOrder: () => NEVER } as any,
        { isLoggedIn: () => true } as any,
        {} as any
      );
      component['cartItems'].set([
        { id: 7, itemId: 99, name: 'Soap', price: 10, quantity: 1, category: 'Health' }
      ]);

      component.removeItem(7);
  jest.advanceTimersByTime(250);

      expect(updateItemQuantity).toHaveBeenCalledWith(99, 0);
      expect(component.isEmpty()).toBeTrue();
      expect(component.subtotal()).toBe(0);
      expect(component.totalItems()).toBe(0);
    });

    it('FE-ACT-06 navigates to checkout for a non-empty cart and blocks an empty cart', () => {
      const navigate = jasmine.createSpy('navigate');
      const component = new CartComponent(
        { navigate } as any,
        { getCurrentOrder: () => NEVER } as any,
        { isLoggedIn: () => true } as any,
        {} as any
      );

      component.goToCheckout();
      expect(navigate).not.toHaveBeenCalled();

      component['cartItems'].set([
        { id: 7, name: 'Soap', price: 10, quantity: 1, category: 'Health' }
      ]);
      component.goToCheckout();

      expect(navigate).toHaveBeenCalledWith(['/checkout']);
    });

    it('FE-ACT-02 flags a backend price change on the affected cart line', () => {
      const component = new CartComponent(
        { navigate: jasmine.createSpy('navigate') } as any,
        { getCurrentOrder: () => NEVER } as any,
        { isLoggedIn: () => true } as any,
        {} as any
      );

      component['processOrderResponse']({
        success: true,
        data: [{
          id: 12,
          items: [{
            id: 99,
            quantity: 2,
            price: 10,
            product: { id: 5, name: 'Soap', price: 12, category: 'Health', stock: 8 }
          }]
        }]
      });

      expect(component.cartItems()[0]).toEqual(jasmine.objectContaining({
        price: 12,
        previousPrice: 10,
        priceChanged: true
      }));
    });

    it('FE-ACT-03 caps quantity at available stock and announces the limit', () => {
      const updateItemQuantity = jasmine.createSpy('updateItemQuantity').and.returnValue(of({ success: true }));
      const component = new CartComponent(
        { navigate: jasmine.createSpy('navigate') } as any,
        { updateItemQuantity, getCurrentOrder: () => NEVER } as any,
        { isLoggedIn: () => true } as any,
        {} as any
      );
      component.cartItems.set([
        { id: 7, itemId: 99, name: 'Soap', price: 10, quantity: 3, stock: 3, category: 'Health' }
      ]);

      component.updateQuantity(7, 1);

      expect(component.cartItems()[0].quantity).toBe(3);
      expect(component.error()).toContain('stock');
      expect(updateItemQuantity).not.toHaveBeenCalled();
    });

    it('FE-ACT-04 animates removal and loads recommendations for the empty state', () => {
      jest.useFakeTimers();
      const productService = {
        filterProductsQuery: jasmine.createSpy('filterProductsQuery').and.returnValue(of({
          success: true,
          data: [{ id: 4, name: 'Mask', price: 5, stock: 10, category: 'Health', brand: 'Ladara', isActive: true, createdAt: '', updatedAt: '', image: '', discountedPrice: 5 }],
          meta: { total: 1 }
        }))
      };
      const component = new CartComponent(
        { navigate: jasmine.createSpy('navigate') } as any,
        { updateItemQuantity: jasmine.createSpy('updateItemQuantity').and.returnValue(of({ success: true })), getCurrentOrder: () => NEVER } as any,
        { isLoggedIn: () => true } as any,
        {} as any,
        productService as any
      );
      component.cartItems.set([
        { id: 7, itemId: 99, name: 'Soap', price: 10, quantity: 1, category: 'Health' }
      ]);

      component.removeItem(7);
      expect(component.removingItemId()).toBe(7);
      jest.advanceTimersByTime(250);

      expect(component.isEmpty()).toBeTrue();
      expect(productService.filterProductsQuery).toHaveBeenCalled();
      expect(component.recommendedProducts()).toHaveLength(1);
    });

    it('FE-ACT-05 shows invalid coupon feedback and uses the backend discount amount', async () => {
      const dialogService = { prompt: jasmine.createSpy('prompt').and.returnValue(Promise.resolve('BADCODE')) };
      const validateCoupon = jest.fn()
        .mockReturnValueOnce(of({ success: false, message: 'Cupón no válido' }))
        .mockReturnValueOnce(of({ success: true, data: { code: 'SAVE5', discountAmount: 5 } }));
      const component = new CartComponent(
        { navigate: jasmine.createSpy('navigate') } as any,
        { validateCoupon, getCurrentOrder: () => NEVER } as any,
        { isLoggedIn: () => true } as any,
        dialogService as any
      );
      component.cartItems.set([
        { id: 1, name: 'Soap', price: 100, quantity: 1, category: 'Health' }
      ]);

      component.onCouponClick();
      await Promise.resolve();
      await Promise.resolve();
      expect(component.couponError()).toBe('Cupón no válido');

      component.applyCouponCode('SAVE5');
      expect(component.couponDiscount()).toBe(5);
      expect(component.cartSummary().couponCode).toBe('SAVE5');
    });
  });
});
