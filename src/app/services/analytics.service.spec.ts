import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [AnalyticsService, provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AnalyticsService);
    httpTesting = TestBed.inject(HttpTestingController);
    localStorage.setItem('token', 'analytics-token');
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('requests admin analytics with the inclusive range and bearer token', () => {
    service.getAdminDashboard('2026-10-01', '2026-10-31').subscribe();
    const request = httpTesting.expectOne('http://localhost:3000/api/analytics/admin/dashboard?from=2026-10-01&to=2026-10-31');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer analytics-token');
    request.flush({ success: true, data: { sales: { currency: 'UYU', confirmedRevenue: 0, paidOrderCount: 0 } } });
  });

  it('rejects invalid and overlong dashboard date ranges before making a request', () => {
    let invalidRangeError: Error | undefined;
    let longRangeError: Error | undefined;
    service.getAdminDashboard('2026-02-30', '2026-03-01').subscribe({ error: error => invalidRangeError = error });
    service.getAdminDashboard('2025-01-01', '2026-01-02').subscribe({ error: error => longRangeError = error });

    expect(invalidRangeError?.message).toContain('fechas válidas');
    expect(longRangeError?.message).toContain('366 días');
    httpTesting.expectNone('http://localhost:3000/api/analytics/admin/dashboard');
  });

  it('reads and updates monthly target and timezone settings', () => {
    service.getMonthlySalesTarget().subscribe();
    service.updateMonthlySalesTarget(250000).subscribe();
    service.getTimezone().subscribe();
    service.updateTimezone('America/Montevideo').subscribe();

    const targetRead = httpTesting.expectOne(request =>
      request.url === 'http://localhost:3000/api/settings/monthly-sales-target' && request.method === 'GET'
    );
    expect(targetRead.request.method).toBe('GET');
    expect(targetRead.request.headers.get('Authorization')).toBe('Bearer analytics-token');
    targetRead.flush({ success: true, data: { key: 'monthlySalesTarget', value: null } });

    const targetWrite = httpTesting.expectOne(request =>
      request.url === 'http://localhost:3000/api/settings/monthly-sales-target' && request.method === 'PUT'
    );
    expect(targetWrite.request.method).toBe('PUT');
    expect(targetWrite.request.body).toEqual({ amount: 250000 });
    targetWrite.flush({ success: true, data: { key: 'monthlySalesTarget', value: 250000 } });

    const timezoneRead = httpTesting.expectOne(request =>
      request.url === 'http://localhost:3000/api/settings/timezone' && request.method === 'GET'
    );
    expect(timezoneRead.request.method).toBe('GET');
    timezoneRead.flush({ success: true, data: { key: 'timezone', value: 'America/Montevideo' } });

    const timezoneWrite = httpTesting.expectOne(request =>
      request.url === 'http://localhost:3000/api/settings/timezone' && request.method === 'PUT'
    );
    expect(timezoneWrite.request.method).toBe('PUT');
    expect(timezoneWrite.request.body).toEqual({ timezone: 'America/Montevideo' });
    timezoneWrite.flush({ success: true, data: { key: 'timezone', value: 'America/Montevideo' } });
  });

  it('validates setting writes before sending requests', () => {
    let amountError: Error | undefined;
    let timezoneError: Error | undefined;
    service.updateMonthlySalesTarget(-1).subscribe({ error: error => amountError = error });
    service.updateTimezone('Not/AZone').subscribe({ error: error => timezoneError = error });

    expect(amountError?.message).toContain('igual o mayor que cero');
    expect(timezoneError?.message).toContain('IANA válida');
    httpTesting.expectNone('http://localhost:3000/api/settings/monthly-sales-target');
    httpTesting.expectNone('http://localhost:3000/api/settings/timezone');
  });
});
