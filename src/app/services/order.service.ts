import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Order, OrderItem } from '../models/order.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private baseUrl = '/api/orders';

  constructor(private http: HttpClient) {}

  createOrder(): Observable<Order> {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      throw new Error('User ID is not available. Please log in first.');
    }
    return this.http.post<Order>(`${this.baseUrl}`, { userId });
  }

  getCurrentOrder(): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/current`);
  }

  getOrder(orderId: number): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/${orderId}`);
  }

  cancelOrder(orderId: number): Observable<Order> {
    return this.http.post<Order>(`${this.baseUrl}/${orderId}/cancel`, {});
  }

  addItemToOrder(orderId: number, productId: number, quantity: number): Observable<OrderItem> {
    return this.http.post<OrderItem>(`${this.baseUrl}/${orderId}/items`, { productId, quantity });
  }

  deleteItemFromOrder(itemId: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/items/${itemId}`);
  }

  markOrderCompleted(orderId: number): Observable<Order> {
    return this.http.post<Order>(`${this.baseUrl}/${orderId}/complete`, {});
  }
}
