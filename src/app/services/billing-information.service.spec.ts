import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BillingInformationService } from './billing-information.service';

describe('BillingInformationService', () => {
  let service: BillingInformationService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BillingInformationService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(BillingInformationService);
    httpTesting = TestBed.inject(HttpTestingController);
    localStorage.setItem('token', 'billing-token');
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('lists addresses with authentication at the API-prefixed route', () => {
    service.list().subscribe();
    const request = httpTesting.expectOne('http://localhost:3000/api/billing-information');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer billing-token');
    request.flush({ success: true, data: [] });
  });

  it('creates and replaces complete address records', () => {
    const input = {
      fullName: 'Ada Lovelace',
      addressLine1: '1 Example Street',
      city: 'Montevideo',
      postalCode: '11000',
      country: 'UY'
    };

    service.create(input).subscribe();
    const createRequest = httpTesting.expectOne('http://localhost:3000/api/billing-information');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual(input);
    createRequest.flush({ success: true, data: { id: 5, ...input } });

    service.update(5, input).subscribe();
    const updateRequest = httpTesting.expectOne('http://localhost:3000/api/billing-information/5');
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.body).toEqual(input);
    updateRequest.flush({ success: true, data: { id: 5, ...input } });
  });

  it('gets and deletes a saved address', () => {
    service.getById(5).subscribe();
    const getRequest = httpTesting.expectOne('http://localhost:3000/api/billing-information/5');
    expect(getRequest.request.method).toBe('GET');
    getRequest.flush({ success: true, data: { id: 5 } });

    service.delete(5).subscribe();
    const deleteRequest = httpTesting.expectOne('http://localhost:3000/api/billing-information/5');
    expect(deleteRequest.request.method).toBe('DELETE');
    expect(deleteRequest.request.headers.get('Authorization')).toBe('Bearer billing-token');
    deleteRequest.flush({ success: true });
  });
});