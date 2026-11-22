import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable, retry, throwError, timer} from 'rxjs';
import {CheckoutOrderDto, OrderDto, OrderFulfillmentUpdateDto, OrderPaymentMethod, OrderPaymentStatus} from './models/order.model';
import {BrowserStorageService} from './browser-storage.service';

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

export type CheckoutRequest = CheckoutOrderDto;

export interface CheckoutResponse {
  success: boolean;
  message?: string;
  data?: OrderDto;
}

export interface AdminDashboardSummary {
  cartCount: number;
  orderPlacedCount: number;
  completedLast30DaysCount: number;
}

export interface AdminDashboardSummaryResponse {
  success: boolean;
  message?: string;
  data?: AdminDashboardSummary;
}

export interface AdminOrder {
  id: number;
  status: string;
  total: number | string;
  createdAt: string;
  paymentMethod?: OrderPaymentMethod | null;
  paymentStatus: OrderPaymentStatus;
  paymentReference: string | null;
  paidAt: string | null;
  invoiceIdentifier: string | null;
  invoiceIssuedAt: string | null;
  isDelivered: boolean;
  deliveredAt: string | null;
  deliveryDocumentIdentifier: string | null;
  completedAt: string | null;
  billingAddress?: {
    fullName?: string;
    company?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  user?: { name?: string };
  items?: AdminOrderItem[];
}

export interface AdminOrderItem {
  id: number;
  productId: number;
  quantity: number;
  price: number | string;
  total?: number | string;
  product?: {
    id: number;
    name: string;
    price?: number | string;
  };
}

export interface OrderFulfillmentResponse {
  success: boolean;
  message?: string;
  data?: AdminOrder;
}

export interface AdminOrdersResponse {
  success: boolean;
  message?: string;
  data?: AdminOrder[];
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private baseUrl = 'http://localhost:3000/api/orders'; // Adjust URL as needed

  constructor(
    private http: HttpClient,
    private readonly storage: BrowserStorageService
  ) {
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.storage.getItem('token');
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

  getAdminDashboardSummary(): Observable<AdminDashboardSummaryResponse> {
    return this.http.get<AdminDashboardSummaryResponse>(`${this.baseUrl}/admin/dashboard-summary`, {
      headers: this.getAuthHeaders()
    });
  }

  getAllOrdersForAdmin(): Observable<AdminOrdersResponse> {
    return this.http.get<AdminOrdersResponse>(`${this.baseUrl}/admin`, {
      headers: this.getAuthHeaders()
    });
  }

  updateOrderFulfillment(orderId: number, update: OrderFulfillmentUpdateDto): Observable<OrderFulfillmentResponse> {
    return this.http.patch<OrderFulfillmentResponse>(`${this.baseUrl}/${orderId}/fulfillment`, update, {
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
