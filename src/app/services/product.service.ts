import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../models/order.model'; // Adjust path if you have a separate product model
@Injectable({
  providedIn: 'root'
})
export class ProductService {
  localhost = 'http://localhost:3000';
  private baseUrl = `${this.localhost}/api/products`;

  constructor(private http: HttpClient) {}

  filterProductsQuery(filters: Product): Observable<any> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params = params.set(key, value as string);
      }
    });

    return this.http.get<any>(`${this.baseUrl}/query`, { params });
  }

  /**
   * Filters products based on the provided filters object.
   * @param filters
   */
  filterProductsBody(filters: Product): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/filter`, filters);
  }

  getAllProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.baseUrl}`);
  }

  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/${id}`);
  }
}
