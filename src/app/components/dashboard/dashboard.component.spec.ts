import { DashboardComponent } from './dashboard.component';
import { of, throwError } from 'rxjs';

describe('DashboardComponent', () => {
  it('delegates auth actions and navigation', () => {
    const router = { navigate: jasmine.createSpy('navigate') };
    const authService = {
      isLoggedIn: jasmine.createSpy('isLoggedIn').and.returnValue(true),
      loginWithGoogle: jasmine.createSpy('loginWithGoogle'),
      logout: jasmine.createSpy('logout')
    };
    const orderService = {
      getAdminDashboardSummary: jasmine.createSpy('getAdminDashboardSummary').and.returnValue(of({
        success: true,
        data: { pendingPaymentCount: 4, preparingCount: 2, completedLast30DaysCount: 8 }
      })),
      getAllOrdersForAdmin: jasmine.createSpy('getAllOrdersForAdmin').and.returnValue(of({ success: true, data: [
        { id: 21, status: 'pending_payment', total: 99.5, createdAt: '2026-01-02', billingAddress: { fullName: 'Ada Lovelace', company: 'Analytical Engines', phone: '555-0123', addressLine1: '12 Example Road', city: 'London' }, items: [{ id: 1, productId: 7, quantity: 2, price: 20, total: 40, product: { id: 7, name: 'Guantes de nitrilo' } }] },
        { id: 22, status: 'completed', total: 20, createdAt: '2026-01-01' }
      ] }))
    };
    const component = new DashboardComponent(router as any, authService as any, orderService as any);

    expect(component.isLoggedIn()).toBeTrue();
    component.ngOnInit();
    expect(orderService.getAdminDashboardSummary).toHaveBeenCalled();
    expect(component.metrics.map(metric => metric.value)).toEqual([4, 2, 8]);
    component.openPendingOrders();
    expect(component.pendingOrders.map(order => order.id)).toEqual([21]);
    expect(component.pendingOrdersTotal).toBe(99.5);
    expect(component.getCustomerName(component.pendingOrders[0])).toBe('Ada Lovelace');
    component.login();
    component.logout();
    component.goToOrders();
    component.goToCart();
    component.goHome();
    component.ngOnDestroy();

    expect(authService.loginWithGoogle).toHaveBeenCalled();
    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(router.navigate).toHaveBeenCalledWith(['/mis-compras']);
    expect(router.navigate).toHaveBeenCalledWith(['/carrito']);
  });

  it('offers a retry when dashboard metrics fail to load', () => {
    const component = new DashboardComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { isLoggedIn: () => true } as any,
      { getAdminDashboardSummary: () => of({ success: false }), getAllOrdersForAdmin: () => of({ success: true, data: [] }) } as any
    );

    component.loadSummary();

    expect(component.error).toBe('La respuesta de indicadores no es válida.');
    expect(component.isLoading).toBeFalse();
  });

  it('shows a retryable error when pending orders cannot be loaded', () => {
    const component = new DashboardComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { isLoggedIn: () => true } as any,
      { getAllOrdersForAdmin: () => throwError(() => new Error('network')) } as any
    );

    component.openPendingOrders();

    expect(component.pendingOrdersError).toBe('No se pudieron cargar los pedidos pendientes de pago.');
    expect(component.isLoadingPendingOrders).toBeFalse();
  });

  it('opens order details with contact and items, then marks the order completed', () => {
    const order = {
      id: 21,
      status: 'pending_payment',
      total: 40,
      createdAt: '2026-01-02',
      billingAddress: { fullName: 'Ada Lovelace', addressLine1: '12 Example Road', city: 'London' },
      items: [{ id: 1, productId: 7, quantity: 2, price: 20, total: 40, product: { id: 7, name: 'Guantes de nitrilo' } }]
    };
    const orderService = {
      completeOrder: jasmine.createSpy('completeOrder').and.returnValue(of({
        success: true,
        data: { ...order, status: 'completed' }
      })),
      getAdminDashboardSummary: jasmine.createSpy('getAdminDashboardSummary').and.returnValue(of({
        success: true,
        data: { pendingPaymentCount: 0, preparingCount: 0, completedLast30DaysCount: 1 }
      }))
    };
    const component = new DashboardComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { isLoggedIn: () => true } as any,
      orderService as any
    );
    component.pendingOrders = [order as any];
    component.openPendingOrderDetail(order as any);

    expect(component.selectedPendingOrder?.id).toBe(21);
    expect(component.getBillingAddress(order as any)).toBe('12 Example Road, London');
    expect(component.getOrderItemTotal(order.items[0] as any)).toBe(40);
    component.changeOrderStatus({ target: { value: 'completed' } } as any);

    expect(orderService.completeOrder).toHaveBeenCalledWith(21);
    expect(component.selectedPendingOrder?.status).toBe('completed');
    expect(component.pendingOrders).toEqual([]);
    expect(component.orderStatusMessage).toBe('El pedido se marcó como completado.');
  });

  it('closes the pending-orders dialog only when the backdrop itself is clicked', () => {
    const component = new DashboardComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { isLoggedIn: () => true } as any,
      {} as any
    );
    const dialog = {};
    const close = jasmine.createSpy('close');
    (component as any).pendingOrdersDialog = { nativeElement: { open: true, close } };

    component.onPendingOrdersBackdropClick({ target: dialog, currentTarget: dialog } as MouseEvent);
    expect(close).toHaveBeenCalled();

    const closeOnContentClick = jasmine.createSpy('closeOnContentClick');
    (component as any).pendingOrdersDialog.nativeElement.close = closeOnContentClick;
    component.onPendingOrdersBackdropClick({ target: {}, currentTarget: dialog } as MouseEvent);
    expect(closeOnContentClick).not.toHaveBeenCalled();
  });
});