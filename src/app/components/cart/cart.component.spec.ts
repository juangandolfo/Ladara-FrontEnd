import { of } from 'rxjs';
import { CartComponent } from './cart.component';

describe('CartComponent', () => {
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

  it('should preserve a zero-quantity item in state while hiding it from the active cart view', () => {
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
    expect(component['cartItems']().length).toBe(1);
    expect(component['cartItems']()[0].quantity).toBe(0);
    expect(component['visibleCartItems']().length).toBe(0);
  });

  it('should clean zero-quantity items from the backend after loading the order', () => {
    const orderService = {
      getCurrentOrder: jasmine.createSpy('getCurrentOrder').and.returnValue(of({
        success: true,
        data: [{
          id: 42,
          items: [{
            id: 99,
            quantity: 0,
            product: {
              id: 5,
              name: 'Soap',
              price: 10,
              category: 'Health',
              image: '/vacuna.jpg'
            }
          }]
        }]
      })),
      deleteItemFromOrder: jasmine.createSpy('deleteItemFromOrder').and.returnValue(of({ success: true }))
    };

    const component = new CartComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      orderService as any,
      { isLoggedIn: () => true } as any
    );

    component['loadCurrentOrder']();

    expect(orderService.deleteItemFromOrder).toHaveBeenCalledWith(99);
    expect(component['visibleCartItems']().length).toBe(0);
  });
});
