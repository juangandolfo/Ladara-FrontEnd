import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('returns null without requesting the current user when logged out', () => {
    service.getCurrentUser().subscribe(user => expect(user).toBeNull());
    httpTesting.expectNone('http://localhost:3000/auth/me');
  });

  it('loads the current user with the bearer token and normalizes admin state', () => {
    localStorage.setItem('token', 'token-123');
    service.getCurrentUser().subscribe(user => {
      expect(user).toEqual({ id: 4, email: 'admin@example.com', isAdmin: true });
    });

    const request = httpTesting.expectOne('http://localhost:3000/auth/me');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-123');
    request.flush({ user: { id: 4, email: 'admin@example.com' }, isAdmin: true });
  });

  it('treats current-user request failures as logged out', () => {
    localStorage.setItem('token', 'expired');
    service.getCurrentUser().subscribe(user => expect(user).toBeNull());
    httpTesting.expectOne('http://localhost:3000/auth/me').flush('unauthorized', {
      status: 401,
      statusText: 'Unauthorized'
    });
  });

  it('recognizes direct and nested admin payloads', () => {
    expect(service.isAdminUser({ isAdmin: true })).toBeTrue();
    expect(service.isAdminUser({ user: { isAdmin: true } })).toBeTrue();
    expect(service.isAdminUser({ isAdmin: false })).toBeFalse();
  });

  it('logs out by removing the token and dispatching a storage event', () => {
    localStorage.setItem('token', 'token-123');
    const dispatchSpy = spyOn(window, 'dispatchEvent').and.callThrough();
    service.logout();
    expect(service.isLoggedIn()).toBeFalse();
    expect(dispatchSpy).toHaveBeenCalledWith(jasmine.objectContaining({ key: 'token', newValue: null }));
  });
});