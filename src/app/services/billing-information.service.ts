import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  BillingInformation,
  BillingInformationInput,
  BillingInformationResponse
} from './models/billing-information.model';
import { BrowserStorageService } from './browser-storage.service';

@Injectable({ providedIn: 'root' })
export class BillingInformationService {
  private readonly baseUrl = 'http://localhost:3000/api/billing-information';

  constructor(
    private readonly http: HttpClient,
    private readonly storage: BrowserStorageService
  ) {}

  list(): Observable<BillingInformationResponse<BillingInformation[]>> {
    return this.http.get<BillingInformationResponse<BillingInformation[]>>(this.baseUrl, {
      headers: this.getAuthHeaders()
    });
  }

  getById(id: number): Observable<BillingInformationResponse<BillingInformation>> {
    return this.http.get<BillingInformationResponse<BillingInformation>>(`${this.baseUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  create(input: BillingInformationInput): Observable<BillingInformationResponse<BillingInformation>> {
    return this.http.post<BillingInformationResponse<BillingInformation>>(this.baseUrl, input, {
      headers: this.getAuthHeaders()
    });
  }

  update(id: number, input: BillingInformationInput): Observable<BillingInformationResponse<BillingInformation>> {
    return this.http.put<BillingInformationResponse<BillingInformation>>(`${this.baseUrl}/${id}`, input, {
      headers: this.getAuthHeaders()
    });
  }

  delete(id: number): Observable<BillingInformationResponse<never>> {
    return this.http.delete<BillingInformationResponse<never>>(`${this.baseUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.storage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
}