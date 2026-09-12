import { of } from 'rxjs';
import { CartComponent } from './cart.component';

describe('CartComponent', () => {
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

    expect(orderService.deleteItemFromOrder).toHaveBeenCalledWith(99);
    expect(component['cartItems']().length).toBe(1);
    expect(component['cartItems']()[0].quantity).toBe(1);
  });

  it('should remove the row when the X button is used', () => {
    const orderService = {
      deleteItemFromOrder: jasmine.createSpy('deleteItemFromOrder').and.returnValue(of({ success: true }))
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

    expect(orderService.deleteItemFromOrder).toHaveBeenCalledWith(99);
    expect(component['cartItems']().length).toBe(0);
  });
});
