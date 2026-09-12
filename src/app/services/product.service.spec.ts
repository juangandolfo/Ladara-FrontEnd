import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ProductService, provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProductService);
    httpTesting = TestBed.inject(HttpTestingController);
    localStorage.setItem('token', 'product-token');
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('serializes defined product filters and sends auth headers', () => {
    service.filterProductsQuery({ name: 'soap', minPrice: 2, includeDeleted: false }).subscribe();
    const request = httpTesting.expectOne(request => request.url === 'http://localhost:3000/api/products/query');
    expect(request.request.params.get('name')).toBe('soap');
    expect(request.request.params.get('minPrice')).toBe('2');
    expect(request.request.params.get('includeDeleted')).toBe('false');
    expect(request.request.params.has('maxPrice')).toBeFalse();
    expect(request.request.headers.get('Authorization')).toBe('Bearer product-token');
    request.flush({ success: true, data: [], meta: { total: 0, count: 0, appliedFilters: {} } });
  });

  it('requests all categories with auth headers', () => {
    service.getAllCategories().subscribe();
    const request = httpTesting.expectOne('http://localhost:3000/api/products/categories');
    expect(request.request.headers.get('Content-Type')).toBe('application/json');
    request.flush({ success: true, data: ['Health'] });
  });
});