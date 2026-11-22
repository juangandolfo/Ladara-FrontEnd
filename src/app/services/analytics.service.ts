import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { BrowserStorageService } from './browser-storage.service';

export interface AdminDashboardData {
  period: { from: string; to: string; timezone: string };
  sales: { currency: 'UYU'; confirmedRevenue: number; paidOrderCount: number };
  revenueByDay: Array<{ date: string; revenue: number; paidOrderCount: number }>;
  monthlyTarget: { amount: number | null; achievedAmount: number; completionPercent: number | null };
  categorySales: Array<{
    categoryId: number;
    categoryName: string;
    revenue: number;
    unitsSold: number;
    sharePercent: number;
  }>;
  activeUsersByCountry: Array<{ country: string | null; userCount: number; sharePercent: number }>;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
    actorName: string | null;
  }>;
}

export interface AdminDashboardResponse {
  success: boolean;
  message?: string;
  data?: AdminDashboardData;
}

export interface BusinessSettingResponse<T> {
  success: boolean;
  message?: string;
  data?: { key: 'monthlySalesTarget' | 'timezone'; value: T };
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly baseUrl = 'http://localhost:3000/api';

  constructor(
    private readonly http: HttpClient,
    private readonly storage: BrowserStorageService
  ) {}

  getAdminDashboard(from: string, to: string): Observable<AdminDashboardResponse> {
    const validationError = this.validateDateRange(from, to);
    if (validationError) return throwError(() => new Error(validationError));

    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<AdminDashboardResponse>(`${this.baseUrl}/analytics/admin/dashboard`, {
      params,
      headers: this.getAuthHeaders()
    });
  }

  getMonthlySalesTarget(): Observable<BusinessSettingResponse<number | null>> {
    return this.http.get<BusinessSettingResponse<number | null>>(
      `${this.baseUrl}/settings/monthly-sales-target`, { headers: this.getAuthHeaders() }
    );
  }

  updateMonthlySalesTarget(amount: number): Observable<BusinessSettingResponse<number | null>> {
    if (!Number.isFinite(amount) || amount < 0) {
      return throwError(() => new Error('La meta debe ser un importe válido igual o mayor que cero.'));
    }
    return this.http.put<BusinessSettingResponse<number | null>>(
      `${this.baseUrl}/settings/monthly-sales-target`, { amount }, { headers: this.getAuthHeaders() }
    );
  }

  getTimezone(): Observable<BusinessSettingResponse<string>> {
    return this.http.get<BusinessSettingResponse<string>>(
      `${this.baseUrl}/settings/timezone`, { headers: this.getAuthHeaders() }
    );
  }

  updateTimezone(timezone: string): Observable<BusinessSettingResponse<string>> {
    if (!this.isValidTimezone(timezone)) {
      return throwError(() => new Error('Selecciona una zona horaria IANA válida.'));
    }
    return this.http.put<BusinessSettingResponse<string>>(
      `${this.baseUrl}/settings/timezone`, { timezone }, { headers: this.getAuthHeaders() }
    );
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.storage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private validateDateRange(from: string, to: string): string | null {
    const fromDate = this.parseDate(from);
    const toDate = this.parseDate(to);
    if (!fromDate || !toDate) return 'Ingresa fechas válidas para el periodo.';
    if (fromDate > toDate) return 'La fecha inicial no puede ser posterior a la fecha final.';
    const days = (toDate.getTime() - fromDate.getTime()) / 86_400_000 + 1;
    return days > 366 ? 'El periodo no puede superar los 366 días.' : null;
  }

  private parseDate(value: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
  }

  private isValidTimezone(timezone: string): boolean {
    if (!timezone.trim()) return false;
    try {
      new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
      return true;
    } catch {
      return false;
    }
  }
}