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
    expect(component.summary?.orderPlacedCount).toBe(2);
    expect(component.summary?.completedLast30DaysCount).toBe(8);
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

  it('loads useful order metrics even when the response omits active cart count', () => {
    const component = new DashboardComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { isLoggedIn: () => true } as any,
      {
        getAdminDashboardSummary: () => of({
          success: true,
          data: { orderPlacedCount: 3, completedLast30DaysCount: 5 }
        })
      } as any
    );

    component.loadSummary();

    expect(component.error).toBeNull();
    expect(component.summary?.orderPlacedCount).toBe(3);
    expect(component.summary?.completedLast30DaysCount).toBe(5);
  });

  it('derives confirmed revenue and recent dashboard orders from admin orders', () => {
    const today = new Date();
    const paidAt = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).toISOString();
    const orderService = {
      getAllOrdersForAdmin: () => of({
        success: true,
        data: [
          { id: 1, status: 'order_placed', total: '25.50', createdAt: paidAt, paymentStatus: 'paid', paidAt },
          { id: 2, status: 'completed', total: 74.5, createdAt: paidAt, paymentStatus: 'paid', paidAt },
          { id: 3, status: 'order_placed', total: 10, createdAt: paidAt, paymentStatus: 'unpaid', paidAt: null },
          { id: 4, status: 'cart', total: 15, createdAt: paidAt, paymentStatus: 'unpaid', paidAt: null },
          { id: 5, status: 'cancelled', total: 20, createdAt: paidAt, paymentStatus: 'paid', paidAt }
        ]
      })
    };
    const component = new DashboardComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { isLoggedIn: () => true } as any,
      orderService as any
    );

    component.loadDashboardOrders();

    expect(component.confirmedRevenue).toBe(100);
    expect(component.confirmedOrderCount).toBe(2);
    expect(component.paidRevenueLastSevenDays).toBe(100);
    expect(component.revenueDays[6].value).toBe(100);
    expect(component.recentDashboardOrders.map(order => order.id)).toEqual([1, 2, 3]);
    expect(component.isLoadingDashboardOrders).toBeFalse();
    component.ngOnDestroy();
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
      })),
      getAllOrdersForAdmin: jasmine.createSpy('getAllOrdersForAdmin').and.returnValue(of({ success: true, data: [] }))
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
    expect(orderService.getAllOrdersForAdmin).toHaveBeenCalled();
    expect(component.selectedPendingOrder?.paymentStatus).toBe('paid');
    expect(component.pendingOrders.map(pendingOrder => pendingOrder.id)).toEqual([21]);
    expect(component.fulfillmentMessage).toContain('Se actualizaron');
    expect(component.getWorkflowStatusLabel('completed')).toBe('Completado');
    expect(component.isUpdatingFulfillment).toBeFalse();
  });

  it('lists completed orders and allows correcting their fulfillment details', () => {
    const completedOrder = {
      id: 45,
      status: 'completed',
      total: 60,
      createdAt: '2026-02-01',
      paymentStatus: 'paid',
      paymentReference: 'TR-OLD',
      paidAt: '2026-02-01',
      invoiceIdentifier: 'INV-45',
      invoiceIssuedAt: '2026-02-01',
      isDelivered: true,
      deliveredAt: '2026-02-02',
      deliveryDocumentIdentifier: 'DEL-45',
      completedAt: '2026-02-02',
      items: [{ id: 5, productId: 7, quantity: 3, price: 20, total: 60, product: { id: 7, name: 'Guantes de nitrilo' } }]
    };
    const orderService = {
      getAllOrdersForAdmin: jasmine.createSpy('getAllOrdersForAdmin').and.returnValue(of({
        success: true,
        data: [completedOrder, { ...completedOrder, id: 46, status: 'order_placed' }]
      })),
      getAdminDashboardSummary: jasmine.createSpy('getAdminDashboardSummary').and.returnValue(of({
        success: true,
        data: { cartCount: 0, orderPlacedCount: 1, completedLast30DaysCount: 1 }
      })),
      updateOrderFulfillment: jasmine.createSpy('updateOrderFulfillment').and.returnValue(of({
        success: true,
        data: { ...completedOrder, paymentReference: 'TR-CORRECTED' }
      }))
    };
    const component = new DashboardComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { isLoggedIn: () => true } as any,
      orderService as any
    );

    component.openCompletedOrders();

    expect(component.isViewingCompletedOrders).toBeTrue();
    expect(component.displayedOrders.map(order => order.id)).toEqual([45]);
    expect(component.displayedOrdersTotal).toBe(60);

    component.openPendingOrderDetail(completedOrder as any);
    component.setPaymentReference({ target: { value: 'TR-CORRECTED' } } as any);
    component.saveOrderFulfillment();

    expect(orderService.updateOrderFulfillment).toHaveBeenCalledWith(45, { paymentReference: 'TR-CORRECTED' });
    expect(completedOrder.paymentReference).toBe('TR-CORRECTED');
    expect(component.fulfillmentMessage).toContain('Se actualizaron');
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

  it('does not send an unchanged fulfillment form and reports unsuccessful responses', () => {
    const updateOrderFulfillment = jasmine.createSpy('updateOrderFulfillment').and.returnValue(of({
      success: false,
      message: 'Update rejected'
    }));
    const component = new DashboardComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { isLoggedIn: () => true } as any,
      { updateOrderFulfillment } as any
    );
    const order = {
      id: 8, status: 'order_placed', total: 10, createdAt: '2026-01-01',
      paymentStatus: 'unpaid', paymentReference: null, paidAt: null, invoiceIdentifier: null,
      invoiceIssuedAt: null, isDelivered: false, deliveredAt: null, deliveryDocumentIdentifier: null,
      completedAt: null
    };

    component.openPendingOrderDetail(order as any);
    component.saveOrderFulfillment();
    expect(updateOrderFulfillment).not.toHaveBeenCalled();

    component.setPaymentStatus({ target: { value: 'paid' } } as any);
    component.saveOrderFulfillment();
    expect(updateOrderFulfillment).toHaveBeenCalledWith(8, { paymentStatus: 'paid' });
    expect(component.fulfillmentError).toBe('Update rejected');
    expect(component.isUpdatingFulfillment).toBeFalse();
  });

  it('shows a generic fulfillment error for a non-conflict transport failure', () => {
    const component = new DashboardComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { isLoggedIn: () => true } as any,
      { updateOrderFulfillment: () => throwError(() => ({ status: 500 })) } as any
    );
    const order = {
      id: 9, status: 'order_placed', total: 10, createdAt: '2026-01-01', paymentStatus: 'unpaid',
      paymentReference: null, paidAt: null, invoiceIdentifier: null, invoiceIssuedAt: null,
      isDelivered: false, deliveredAt: null, deliveryDocumentIdentifier: null, completedAt: null
    };

    component.openPendingOrderDetail(order as any);
    component.setDelivered({ target: { checked: true } } as any);
    component.saveOrderFulfillment();

    expect(component.fulfillmentError).toBe('No se pudo actualizar el pedido. Inténtalo nuevamente.');
    expect(component.isUpdatingFulfillment).toBeFalse();
  });
});