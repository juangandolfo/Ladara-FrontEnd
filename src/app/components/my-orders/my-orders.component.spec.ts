import { of, throwError } from 'rxjs';
import { MyOrdersComponent, Order, OrderStatus } from './my-orders.component';

describe('MyOrdersComponent', () => {
  function createComponent(orderService: any = {}): MyOrdersComponent {
    return new MyOrdersComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      orderService
    );
  }

  function order(id: number, status: OrderStatus, createdAt: string, price: number): Order {
    return {
      id,
      status,
      createdAt,
      updatedAt: createdAt,
      items: [{
        id: id * 10,
        quantity: 2,
        product: { id: id * 100, name: 'Product', price, discountedPrice: price - 1, category: 'Health' }
      }]
    };
  }

  it('loads, sorts, groups orders, and calculates completed spending', () => {
    const orders = [
      order(1, OrderStatus.COMPLETED, '2025-01-01', 10),
      order(2, OrderStatus.PREPARING, '2025-03-01', 20),
      order(3, OrderStatus.CANCELLED, '2025-02-01', 30)
    ];
    const component = createComponent({ getAllOrders: () => of({ success: true, data: orders }) });

    component.loadOrders();

    expect(component.orders().map(item => item.id)).toEqual([2, 3, 1]);
    expect(component.preparingOrders().map(item => item.id)).toEqual([2]);
    expect(component.completedOrders().map(item => item.id)).toEqual([3, 1]);
    expect(component.orderSummary()).toEqual({ pendingPaymentCount: 0, preparingCount: 1, completedCount: 2, totalSpent: 18 });
    expect(component.isEmpty()).toBeFalse();
  });

  it('repeats every item into the current order and navigates to cart', async () => {
    const orderToRepeat = order(7, OrderStatus.COMPLETED, '2025-01-01', 10);
    const router = { navigate: jasmine.createSpy('navigate') };
    const orderService = {
      getCurrentOrder: () => of({ data: [{ id: 99 }] }),
      addItemToOrder: jasmine.createSpy('addItemToOrder').and.returnValue(of({ success: true }))
    };
    const component = new MyOrdersComponent(router as any, orderService as any);

    await component.repeatOrder(orderToRepeat);

    expect(orderService.addItemToOrder).toHaveBeenCalledWith(99, 700, 2);
    expect(router.navigate).toHaveBeenCalledWith(['/carrito']);
    expect(component.isRepeatingOrder()).toBeFalse();
  });

  it('maps statuses, prices, images, and navigation targets', () => {
    const router = { navigate: jasmine.createSpy('navigate') };
    const component = new MyOrdersComponent(router as any, {} as any);
    const product = { id: 1, name: 'P', price: 20, discountedPrice: 15, category: 'Health', image: 'images/p.jpg' };

    expect(component.getStatusText(OrderStatus.DELIVERY)).toBe('En Entrega');
    expect(component.getStatusClass(OrderStatus.DELIVERY)).toBe('status-delivery');
    expect(component.getStatusText(OrderStatus.PENDING)).toBe('Pendiente de pago');
    expect(component.getStatusText('awaiting_payment')).toBe('Pendiente de pago');
    expect(component.getStatusClass('pending_payment')).toBe('status-pending');
    expect(component.calculateOrderTotal({ items: [{ id: 1, quantity: 2, product }] } as any)).toBe(30);
    expect(component.getProductImage(product as any)).toBe('/images/p.jpg');
    component.goToCart();
    component.continueShopping();
    expect(router.navigate).toHaveBeenCalledWith(['/carrito']);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('surfaces payment-pending orders and toggles their details', () => {
    const pendingOrder = order(4, OrderStatus.PENDING, '2025-04-01', 12);
    const component = createComponent({
      getAllOrders: () => of({ success: true, data: [pendingOrder] })
    });

    component.loadOrders();

    expect(component.pendingPaymentOrders().map(item => item.id)).toEqual([4]);
    expect(component.preparingOrders()).toEqual([]);
    expect(component.orderSummary().pendingPaymentCount).toBe(1);
    expect(component.isOrderExpanded(4)).toBeFalse();

    component.toggleOrderDetails(4);
    expect(component.isOrderExpanded(4)).toBeTrue();
    component.toggleOrderDetails(4);
    expect(component.isOrderExpanded(4)).toBeFalse();
  });

  it('keeps load errors visible and clears the loading state', () => {
    const component = createComponent({
      getAllOrders: () => throwError(() => new Error('Network error'))
    });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    component.loadOrders();

    expect(component.isLoading()).toBeFalse();
    expect(component.error()).toBe('Error al cargar las órdenes');
    expect(component.isEmpty()).toBeFalse();
  });
});