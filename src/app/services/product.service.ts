import {Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {FilterProductsApiResponse, ProductFilterDto} from './models/product.models'; // Adjust path if you have a separate product model
@Injectable({
  providedIn: 'root'
})
export class ProductService {
  localhost = 'http://localhost:3000';
  private baseUrl = `${this.localhost}/api/products`;

  constructor(private http: HttpClient) {
  }

  filterProductsQuery(filters: ProductFilterDto): Observable<FilterProductsApiResponse> {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<FilterProductsApiResponse>(`${this.baseUrl}/query`, {params});
  }
}
