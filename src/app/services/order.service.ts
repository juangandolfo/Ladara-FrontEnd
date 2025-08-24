import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {
  AddItemResponse,
  AddItemToOrderDto,
  CancelOrderResponse,
  CreateOrderResponse,
  DeleteItemResponse,
  GetCurrentOrderResponse,
  GetOrderResponse
} from './models/order.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private baseUrl = '/api/orders';

  constructor(private http: HttpClient) {
  }

  createOrder(): Observable<CreateOrderResponse> {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      throw new Error('User ID is not available. Please log in first.');
    }
    return this.http.post<CreateOrderResponse>(`${this.baseUrl}`, {userId});
  }

  getCurrentOrder(): Observable<GetCurrentOrderResponse> {
    return this.http.get<GetCurrentOrderResponse>(`${this.baseUrl}/current`);
  }

  getOrder(orderId: number): Observable<GetOrderResponse> {
    return this.http.get<GetOrderResponse>(`${this.baseUrl}/${orderId}`);
  }

  cancelOrder(orderId: number): Observable<CancelOrderResponse> {
    return this.http.post<CancelOrderResponse>(`${this.baseUrl}/${orderId}/cancel`, {});
  }

  addItemToOrder(orderId: number, productId: number, quantity: number): Observable<AddItemResponse> {
    const addItemDto: AddItemToOrderDto = {productId, quantity};
    return this.http.post<AddItemResponse>(`${this.baseUrl}/${orderId}/items`, addItemDto);
  }

  deleteItemFromOrder(itemId: number): Observable<DeleteItemResponse> {
    return this.http.delete<DeleteItemResponse>(`${this.baseUrl}/items/${itemId}`);
  }
}
