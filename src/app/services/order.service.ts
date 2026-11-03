import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable, retry, throwError, timer} from 'rxjs';

export interface AddItemToOrderDto {
  productId: number;
  quantity: number;
}

export interface AddItemResponse {
  success: boolean;
  item?: any;
  message?: string;
}

export interface UpdateItemQuantityDto {
  quantity: number;
}

export interface DeleteItemResponse {
  success: boolean;
  message?: string;
}

export interface CouponValidationResponse {
  success: boolean;
  message?: string;
  data?: { valid?: boolean; code?: string; discountAmount?: number; discount?: number; message?: string };
}

export interface OrderValidationResponse {
  success: boolean;
  message?: string;
  data?: {
    valid: boolean;
    rejectedItems?: Array<{ itemId: number; reason: string; message?: string }>;
  };
}

export interface CheckoutRequest {
  billingAddress: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  paymentMethod: string;
}

export interface CheckoutResponse {
  success: boolean;
  message?: string;
  data?: unknown;
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
    }).pipe(retry({count: 1, delay: error => this.retryTransientRequest(error)}));
  }

  updateItemQuantity(itemId: number, quantity: number): Observable<any> {
    const updateItemDto: UpdateItemQuantityDto = {quantity};
    return this.http.put<any>(`${this.baseUrl}/items/${itemId}`, updateItemDto, {
      headers: this.getAuthHeaders()
    }).pipe(retry({count: 1, delay: error => this.retryTransientRequest(error)}));
  }

  deleteItemFromOrder(itemId: number): Observable<DeleteItemResponse> {
    return this.http.delete<DeleteItemResponse>(`${this.baseUrl}/items/${itemId}`, {
      headers: this.getAuthHeaders()
    }).pipe(retry({count: 1, delay: error => this.retryTransientRequest(error)}));
  }

  clearCurrentCart(): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(`${this.baseUrl}/current/items`, {
      headers: this.getAuthHeaders()
    }).pipe(retry({count: 1, delay: error => this.retryTransientRequest(error)}));
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

  validateCoupon(code: string): Observable<CouponValidationResponse> {
    return this.http.post<CouponValidationResponse>(`${this.baseUrl}/coupons/validate`, { code }, {
      headers: this.getAuthHeaders()
    });
  }

  validateCurrentOrder(orderId: number): Observable<OrderValidationResponse> {
    return this.http.post<OrderValidationResponse>(`${this.baseUrl}/${orderId}/validate`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  initiateCheckout(orderId: number, checkout: CheckoutRequest): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${this.baseUrl}/${orderId}/checkout`, checkout, {
      headers: this.getAuthHeaders()
    });
  }

  private retryTransientRequest(error: any): Observable<any> {
    if (error?.status === 0 || error?.status >= 500) {
      return timer(150);
    }
    return throwError(() => error);
  }
}
