import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable} from 'rxjs';

export interface AddItemToOrderDto {
  productId: number;
  quantity: number;
}

export interface AddItemResponse {
  success: boolean;
  item?: any;
  message?: string;
}

export interface DeleteItemResponse {
  success: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private baseUrl = 'http://localhost:3000/api/orders'; // Adjust URL as needed

  constructor(private http: HttpClient) {
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  addItemToOrder(orderId: number, productId: number, quantity: number): Observable<AddItemResponse> {
    const addItemDto: AddItemToOrderDto = {productId, quantity};
    return this.http.post<AddItemResponse>(`${this.baseUrl}/${orderId}/items`, addItemDto, {
      headers: this.getAuthHeaders()
    });
  }

  deleteItemFromOrder(itemId: number): Observable<DeleteItemResponse> {
    return this.http.delete<DeleteItemResponse>(`${this.baseUrl}/items/${itemId}`, {
      headers: this.getAuthHeaders()
    });
  }

  getCurrentOrder(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/current`, {
      headers: this.getAuthHeaders()
    });
  }

  getAllOrders(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}`, {
      headers: this.getAuthHeaders()
    });
  }
}
