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
    expect(service.isAdminUser(null)).toBeFalse();
  });

  it('normalizes direct current-user payloads and empty responses', () => {
    localStorage.setItem('token', 'token-456');
    service.getCurrentUser().subscribe(user => {
      expect(user).toEqual({ id: 8, name: 'Ada', isAdmin: false });
    });
    httpTesting.expectOne('http://localhost:3000/auth/me').flush({ id: 8, name: 'Ada' });

    service.getCurrentUser().subscribe(user => expect(user).toBeNull());
    httpTesting.expectOne('http://localhost:3000/auth/me').flush(null);
  });

  it('tracks login state with and without a token', () => {
    expect(service.isLoggedIn()).toBeFalse();
    localStorage.setItem('token', 'token-789');
    expect(service.isLoggedIn()).toBeTrue();
  });

  it('ignores invalid login messages and accepts a valid regular-user message', () => {
    const popup = { closed: false, close: jasmine.createSpy('close') };
    spyOn(window, 'open').and.returnValue(popup as any);
    spyOn(window, 'addEventListener').and.callThrough();
    const removeListener = spyOn(window, 'removeEventListener').and.callThrough();
    const dispatch = spyOn(window, 'dispatchEvent').and.callThrough();
    const router = TestBed.inject(Router) as any;

    service.loginWithGoogle();
    window.dispatchEvent(new MessageEvent('message', {
      origin: 'https://untrusted.example', data: { token: 'ignored' }
    }));
    window.dispatchEvent(new MessageEvent('message', {
      origin: 'http://localhost:3000', data: { user: { id: 2 } }
    }));
    expect(localStorage.getItem('token')).toBeNull();

    window.dispatchEvent(new MessageEvent('message', {
      origin: 'http://localhost:3000', data: { token: 'regular-token', user: { id: 2, isAdmin: false } }
    }));

    expect(localStorage.getItem('token')).toBe('regular-token');
    expect(popup.close).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(jasmine.objectContaining({ key: 'token', newValue: 'regular-token' }));
    expect(router.navigate).not.toHaveBeenCalled();
    expect(removeListener).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('redirects an admin after login even when the popup was blocked', () => {
    spyOn(window, 'open').and.returnValue(null);
    spyOn(window, 'addEventListener').and.callThrough();
    const removeListener = spyOn(window, 'removeEventListener').and.callThrough();
    const router = TestBed.inject(Router) as any;

    service.loginWithGoogle();
    window.dispatchEvent(new MessageEvent('message', {
      origin: 'http://localhost:3000', data: { token: 'admin-token', user: { isAdmin: true } }
    }));

    expect(localStorage.getItem('token')).toBe('admin-token');
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(removeListener).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('logs out by removing the token and dispatching a storage event', () => {
    localStorage.setItem('token', 'token-123');
    const dispatchSpy = spyOn(window, 'dispatchEvent').and.callThrough();
    service.logout();
    expect(service.isLoggedIn()).toBeFalse();
    expect(dispatchSpy).toHaveBeenCalledWith(jasmine.objectContaining({ key: 'token', newValue: null }));
  });
});