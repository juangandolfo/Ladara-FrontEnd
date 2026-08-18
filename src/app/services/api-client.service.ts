/**
 * API Client Service
 * 
 * Provides type-safe HTTP methods using shared contracts from @ladara/shared-contracts
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import {
  ApiResponse,
  ApiRoutes,
  createAuthHeader,
  parseApiError,
  shouldRetry,
  ApiErrorCode,
  buildUrlWithQuery
} from '@ladara/shared-contracts';

@Injectable({
  providedIn: 'root'
})
export class ApiClientService {
  private token: string | null = null;
  private maxRetries = 3;

  constructor(private http: HttpClient) {}

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Clear authentication token
   */
  clearToken(): void {
    this.token = null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.token;
  }

  /**
   * GET request with automatic retries
   */
  get<T>(url: string, options?: any): Observable<T> {
    return this.http.get<T>(url, {
      headers: this.getHeaders(),
      ...options
    }).pipe(
      retry(this.maxRetries),
      catchError((error) => this.handleError(error))
    );
  }

  /**
   * POST request
   */
  post<T>(url: string, body: any, options?: any): Observable<T> {
    return this.http.post<T>(url, body, {
      headers: this.getHeaders(),
      ...options
    }).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  /**
   * PUT request
   */
  put<T>(url: string, body: any, options?: any): Observable<T> {
    return this.http.put<T>(url, body, {
      headers: this.getHeaders(),
      ...options
    }).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  /**
   * DELETE request
   */
  delete<T>(url: string, options?: any): Observable<T> {
    return this.http.delete<T>(url, {
      headers: this.getHeaders(),
      ...options
    }).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  /**
   * PATCH request
   */
  patch<T>(url: string, body: any, options?: any): Observable<T> {
    return this.http.patch<T>(url, body, {
      headers: this.getHeaders(),
      ...options
    }).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  /**
   * Get request with query parameters
   */
  getWithParams<T>(url: string, params?: Record<string, any>): Observable<T> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }

    return this.http.get<T>(url, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      retry(this.maxRetries),
      catchError((error) => this.handleError(error))
    );
  }

  /**
   * Build full API URL from endpoint path
   */
  buildUrl(endpoint: string): string {
    const baseUrl = this.getApiBaseUrl();
    return `${baseUrl}${endpoint}`;
  }

  /**
   * Get API base URL
   */
  getApiBaseUrl(): string {
    return localStorage.getItem('API_BASE_URL') || 'http://localhost:3000';
  }

  /**
   * Set API base URL
   */
  setApiBaseUrl(url: string): void {
    localStorage.setItem('API_BASE_URL', url);
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Handle API errors
   */
  private handleError(error: any) {
    const apiError = parseApiError(error);
    
    // Log error for debugging
    console.error('[API Error]', {
      code: apiError.code,
      message: apiError.message,
      statusCode: apiError.statusCode,
      details: apiError.details
    });

    return throwError(() => apiError);
  }

  /**
   * Get user's current cart order
   */
  getCurrentOrder<T extends ApiResponse<any>>(): Observable<T> {
    return this.get<T>(ApiRoutes.orders.current());
  }

  /**
   * Get all user orders
   */
  getUserOrders<T extends ApiResponse<any>>(): Observable<T> {
    return this.get<T>(ApiRoutes.orders.list());
  }

  /**
   * Add item to order
   */
  addItemToOrder<T extends ApiResponse<any>>(orderId: number, body: any): Observable<T> {
    return this.post<T>(ApiRoutes.orders.addItem(orderId), body);
  }

  /**
   * Update order item quantity
   */
  updateItemQuantity<T extends ApiResponse<any>>(itemId: number, body: any): Observable<T> {
    return this.put<T>(ApiRoutes.orders.updateItem(itemId), body);
  }

  /**
   * Delete item from order
   */
  deleteOrderItem<T extends ApiResponse<any>>(itemId: number): Observable<T> {
    return this.delete<T>(ApiRoutes.orders.deleteItem(itemId));
  }

  /**
   * Get products with filters
   */
  getProducts<T extends ApiResponse<any>>(filters?: Record<string, any>): Observable<T> {
    if (filters) {
      return this.getWithParams<T>(ApiRoutes.products.query(filters), filters);
    }
    return this.get<T>(ApiRoutes.products.query());
  }

  /**
   * Get product categories
   */
  getCategories<T extends ApiResponse<any>>(): Observable<T> {
    return this.get<T>(ApiRoutes.products.categories());
  }

  /**
   * Get current user
   */
  getCurrentUser<T extends ApiResponse<any>>(): Observable<T> {
    return this.get<T>(ApiRoutes.auth.me());
  }
}
