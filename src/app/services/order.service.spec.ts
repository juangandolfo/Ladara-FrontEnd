import { TestBed } from '@angular/core/testing';
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
});