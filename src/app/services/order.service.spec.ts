import { TestBed } from '@angular/core/testing';
import { fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OrderService } from './order.service';

describe('OrderService', () => {
  let service: OrderService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [OrderService, provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(OrderService);
    httpTesting = TestBed.inject(HttpTestingController);
    localStorage.setItem('token', 'order-token');
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('adds an item to an order', () => {
    service.addItemToOrder(8, 12, 3).subscribe();
    const request = httpTesting.expectOne('http://localhost:3000/api/orders/8/items');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ productId: 12, quantity: 3 });
    expect(request.request.headers.get('Authorization')).toBe('Bearer order-token');
    request.flush({ success: true });
  });

  it('updates an item quantity through the item endpoint', () => {
    service.updateItemQuantity(22, 2).subscribe();
    const request = httpTesting.expectOne('http://localhost:3000/api/orders/items/22');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ quantity: 2 });
    expect(request.request.headers.get('Authorization')).toBe('Bearer order-token');
    request.flush({ success: true });
  });

  it('clears the current cart through the dedicated endpoint', () => {
    service.clearCurrentCart().subscribe();
    const request = httpTesting.expectOne('http://localhost:3000/api/orders/current/items');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.headers.get('Authorization')).toBe('Bearer order-token');
    request.flush({ success: true });
  });

  it('deletes an item and loads current and all orders', () => {
    service.deleteItemFromOrder(22).subscribe();
    service.getCurrentOrder().subscribe();
    service.getAllOrders().subscribe();
    const deleteRequest = httpTesting.expectOne('http://localhost:3000/api/orders/items/22');
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush({ success: true });
    httpTesting.expectOne('http://localhost:3000/api/orders/current').flush({ success: true, data: [] });
    httpTesting.expectOne('http://localhost:3000/api/orders').flush({ success: true, data: [] });
  });

  it('loads admin dashboard order summary with authentication', () => {
    service.getAdminDashboardSummary().subscribe();

    const request = httpTesting.expectOne('http://localhost:3000/api/orders/admin/dashboard-summary');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer order-token');
    request.flush({
      success: true,
      data: { cartCount: 3, orderPlacedCount: 1, completedLast30DaysCount: 12 }
    });
  });

  it('loads all orders for the admin dashboard with authentication', () => {
    service.getAllOrdersForAdmin().subscribe();
    const request = httpTesting.expectOne('http://localhost:3000/api/orders/admin');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer order-token');
    request.flush({ success: true, data: [] });
  });

  it('updates only supplied fulfillment fields through the admin patch endpoint', () => {
    const update = { paymentStatus: 'paid' as const, paymentReference: null, isDelivered: true };
    service.updateOrderFulfillment(42, update).subscribe();
    const request = httpTesting.expectOne('http://localhost:3000/api/orders/42/fulfillment');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(update);
    expect(request.request.headers.get('Authorization')).toBe('Bearer order-token');
    request.flush({ success: true, data: { id: 42, status: 'preparing', total: 80, createdAt: '2026-01-01' } });
  });

  it('validates a coupon code against the coupon endpoint', () => {
    service.validateCoupon('SAVE5').subscribe();
    const request = httpTesting.expectOne('http://localhost:3000/api/orders/coupons/validate');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ code: 'SAVE5' });
    expect(request.request.headers.get('Authorization')).toBe('Bearer order-token');
    request.flush({ success: true, data: { valid: true, code: 'SAVE5', discountAmount: 5 } });
  });

  it('validates the current order before checkout', () => {
    service.validateCurrentOrder(8).subscribe();
    const request = httpTesting.expectOne('http://localhost:3000/api/orders/8/validate');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    expect(request.request.headers.get('Authorization')).toBe('Bearer order-token');
    request.flush({ success: true, data: { valid: false, rejectedItems: [] } });
  });

  it('submits checkout details to the order checkout endpoint', () => {
    const checkout = {
      billingInformationId: 5,
      paymentMethod: 'bank_transfer' as const
    };

    service.initiateCheckout(8, checkout).subscribe();

    const request = httpTesting.expectOne('http://localhost:3000/api/orders/8/checkout');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(checkout);
    expect(request.request.headers.get('Authorization')).toBe('Bearer order-token');
    request.flush({ success: true, message: 'Checkout details saved; payment has not been processed' });
  });

  it('retries a transient server failure once and can then succeed', fakeAsync(() => {
    let response: unknown;
    let failure: unknown;
    service.addItemToOrder(8, 12, 1).subscribe({
      next: value => response = value,
      error: error => failure = error
    });

    httpTesting.expectOne('http://localhost:3000/api/orders/8/items').flush('unavailable', {
      status: 503,
      statusText: 'Service Unavailable'
    });
    tick(150);
    httpTesting.expectOne('http://localhost:3000/api/orders/8/items').flush({ success: true });

    expect(response).toEqual({ success: true });
    expect(failure).toBeUndefined();
  }));

  it('stops after the configured retry when a transient request keeps failing', fakeAsync(() => {
    let failure: any;
    service.clearCurrentCart().subscribe({ error: error => failure = error });

    httpTesting.expectOne('http://localhost:3000/api/orders/current/items').flush('offline', {
      status: 0,
      statusText: 'Unknown Error'
    });
    tick(150);
    httpTesting.expectOne('http://localhost:3000/api/orders/current/items').flush('still unavailable', {
      status: 503,
      statusText: 'Service Unavailable'
    });

    expect(failure?.status).toBe(503);
  }));

  it('does not retry a non-transient client error', fakeAsync(() => {
    let failure: any;
    service.deleteItemFromOrder(22).subscribe({ error: error => failure = error });

    httpTesting.expectOne('http://localhost:3000/api/orders/items/22').flush('invalid', {
      status: 400,
      statusText: 'Bad Request'
    });
    tick(200);

    expect(failure?.status).toBe(400);
    httpTesting.expectNone('http://localhost:3000/api/orders/items/22');
  }));
});