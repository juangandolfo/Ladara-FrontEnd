import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NgZone } from '@angular/core';
import { zoneChangeDetectionInterceptor } from './zone-change-detection.interceptor';

describe('zoneChangeDetectionInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let zone: NgZone;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([zoneChangeDetectionInterceptor])),
        provideHttpClientTesting()
      ]
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    zone = TestBed.inject(NgZone);
  });

  afterEach(() => httpTesting.verify());

  it('delivers a response inside Angular when the request starts outside the zone', () => {
    let responseArrivedInsideAngular = false;

    zone.runOutsideAngular(() => {
      http.get('/api/test').subscribe(() => {
        responseArrivedInsideAngular = NgZone.isInAngularZone();
      });
    });

    zone.runOutsideAngular(() => {
      httpTesting.expectOne('/api/test').flush({ success: true });
    });

    expect(responseArrivedInsideAngular).toBeTrue();
  });
});
