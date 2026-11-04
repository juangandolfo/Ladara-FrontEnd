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
        data: { cartCount: 4, orderPlacedCount: 2, completedLast30DaysCount: 8 }
      })),
      getAllOrdersForAdmin: jasmine.createSpy('getAllOrdersForAdmin').and.returnValue(of({ success: true, data: [
        { id: 21, status: 'order_placed', total: 99.5, createdAt: '2026-01-02', billingAddress: { fullName: 'Ada Lovelace', company: 'Analytical Engines', phone: '555-0123', addressLine1: '12 Example Road', city: 'London' }, items: [{ id: 1, productId: 7, quantity: 2, price: 20, total: 40, product: { id: 7, name: 'Guantes de nitrilo' } }] },
        { id: 22, status: 'completed', total: 20, createdAt: '2026-01-01' }
      ] }))
    };
    const component = new DashboardComponent(router as any, authService as any, orderService as any);

    expect(component.isLoggedIn()).toBeTrue();
    component.ngOnInit();
    expect(orderService.getAdminDashboardSummary).toHaveBeenCalled();
    expect(component.metrics.map(metric => metric.value)).toEqual([4, 2, 8]);
    expect(component.metrics.map(metric => metric.label)).toEqual([
      'Carritos activos', 'Pedidos realizados', 'Pedidos finalizados en los últimos 30 días'
    ]);
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

    expect(component.error).toBe('La respuesta del resumen no contiene los indicadores esperados.');
    expect(component.isLoading).toBeFalse();
  });

  it('shows a retryable error when pending orders cannot be loaded', () => {
    const component = new DashboardComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { isLoggedIn: () => true } as any,
      { getAllOrdersForAdmin: () => throwError(() => new Error('network')) } as any
    );

    component.openPendingOrders();

    expect(component.pendingOrdersError).toBe('No se pudieron cargar los pedidos realizados. Inténtalo nuevamente.');
    expect(component.isLoadingPendingOrders).toBeFalse();
  });

  it('shows the backend reason when the admin order endpoint fails', () => {
    const component = new DashboardComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { isLoggedIn: () => true } as any,
      {
        getAllOrdersForAdmin: () => throwError(() => ({
          status: 500,
          error: { message: 'Order shipping cost is invalid' }
        }))
      } as any
    );

    component.openPendingOrders();

    expect(component.pendingOrdersError).toBe('No se pudieron cargar los pedidos: Order shipping cost is invalid');
    expect(component.isLoadingPendingOrders).toBeFalse();
  });

  it('explains authorization failures when loading admin orders', () => {
    const component = new DashboardComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { isLoggedIn: () => true } as any,
      { getAllOrdersForAdmin: () => throwError(() => ({ status: 403 })) } as any
    );

    component.openPendingOrders();

    expect(component.pendingOrdersError).toBe('Tu cuenta no tiene permisos de administrador para consultar los pedidos.');
  });

  it('opens order details and sends only changed fulfillment fields', () => {
    const order = {
      id: 21,
      status: 'order_placed',
      total: 40,
      createdAt: '2026-01-02',
      paymentMethod: 'bank_transfer',
      paymentStatus: 'unpaid',
      paymentReference: null,
      paidAt: null,
      invoiceIdentifier: null,
      invoiceIssuedAt: null,
      isDelivered: false,
      deliveredAt: null,
      deliveryDocumentIdentifier: null,
      completedAt: null,
      billingAddress: { fullName: 'Ada Lovelace', addressLine1: '12 Example Road', city: 'London' },
      items: [{ id: 1, productId: 7, quantity: 2, price: 20, total: 40, product: { id: 7, name: 'Guantes de nitrilo' } }]
    };
    const orderService = {
      updateOrderFulfillment: jasmine.createSpy('updateOrderFulfillment').and.returnValue(of({
        success: true,
        data: { ...order, paymentStatus: 'paid', isDelivered: true, paidAt: '2026-01-03', deliveredAt: '2026-01-04' }
      })),
      getAdminDashboardSummary: jasmine.createSpy('getAdminDashboardSummary').and.returnValue(of({
        success: true,
        data: { cartCount: 0, orderPlacedCount: 0, completedLast30DaysCount: 1 }
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
    component.setPaymentStatus({ target: { value: 'paid' } } as any);
    component.setDelivered({ target: { checked: true } } as any);
    component.saveOrderFulfillment();

    expect(orderService.updateOrderFulfillment).toHaveBeenCalledWith(21, {
      paymentStatus: 'paid',
      isDelivered: true
    });
    expect(component.selectedPendingOrder?.paymentStatus).toBe('paid');
    expect(component.pendingOrders.map(pendingOrder => pendingOrder.id)).toEqual([21]);
    expect(component.fulfillmentMessage).toContain('Se actualizaron');
    expect(component.getWorkflowStatusLabel('completed')).toBe('Completado');
    expect(component.isUpdatingFulfillment).toBeFalse();
  });

  it('sends null to clear fulfillment references and turns invoice off independently', () => {
    const order = {
      id: 32,
      status: 'preparing',
      total: 80,
      createdAt: '2026-01-02',
      paymentStatus: 'paid',
      paymentReference: 'TR-1',
      paidAt: '2026-01-02',
      invoiceIdentifier: 'INV-1',
      invoiceIssuedAt: '2026-01-03',
      isDelivered: true,
      deliveredAt: '2026-01-04',
      deliveryDocumentIdentifier: 'DOC-1',
      completedAt: null
    };
    const updateOrderFulfillment = jasmine.createSpy('updateOrderFulfillment').and.returnValue(of({
      success: true,
      data: {
        ...order, paymentReference: null, invoiceIdentifier: null, invoiceIssuedAt: null,
        isDelivered: false, deliveredAt: null, deliveryDocumentIdentifier: null
      }
    }));
    const component = new DashboardComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { isLoggedIn: () => true } as any,
      { updateOrderFulfillment } as any
    );
    component.openPendingOrderDetail(order as any);
    component.setPaymentReference({ target: { value: '' } } as any);
    component.setInvoiceIssued({ target: { checked: false } } as any);
    component.setDelivered({ target: { checked: false } } as any);
    component.setDeliveryDocumentIdentifier({ target: { value: '' } } as any);
    component.saveOrderFulfillment();

    expect(updateOrderFulfillment).toHaveBeenCalledWith(32, {
      paymentReference: null,
      invoiceIssued: false,
      invoiceIdentifier: null,
      isDelivered: false,
      deliveryDocumentIdentifier: null
    });
  });

  it('shows a useful message when fulfillment updates conflict', () => {
    const component = new DashboardComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { isLoggedIn: () => true } as any,
      {
        updateOrderFulfillment: () => throwError(() => ({
          status: 409,
          error: { message: 'El pedido no pudo actualizarse.' }
        }))
      } as any
    );
    const order = {
      id: 8, status: 'pending_payment', total: 10, createdAt: '2026-01-01',
      paymentStatus: 'unpaid', paymentReference: null, paidAt: null, invoiceIdentifier: null,
      invoiceIssuedAt: null, isDelivered: false, deliveredAt: null, deliveryDocumentIdentifier: null,
      completedAt: null
    };
    component.openPendingOrderDetail(order as any);
    component.setPaymentStatus({ target: { value: 'paid' } } as any);
    component.saveOrderFulfillment();

    expect(component.fulfillmentError).toBe('El pedido no pudo actualizarse.');
    expect(component.isUpdatingFulfillment).toBeFalse();
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