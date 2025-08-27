import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {FilterProductsApiResponse, ProductFilterDto} from './models/product.models';
import {ApiResponse} from './models/base.model';
import {GetCategoriesResponse} from './models/order.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  localhost = 'http://localhost:3000';
  private baseUrl = `${this.localhost}/api/products`;

  constructor(private http: HttpClient) {
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  filterProductsQuery(filters: ProductFilterDto): Observable<FilterProductsApiResponse> {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<FilterProductsApiResponse>(`${this.baseUrl}/query`, {
      params,
      headers: this.getAuthHeaders()
    });
  }

  getAllCategories(): Observable<GetCategoriesResponse> {
    return this.http.get<ApiResponse<string[]>>(`${this.baseUrl}/categories`, {
      headers: this.getAuthHeaders()
    });
  }
}
