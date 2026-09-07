import { of, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AdminDashboardGuard, AdminHomeRedirectGuard } from './auth.guard';

describe('Admin guards', () => {
  let router: { navigate: jasmine.Spy };

  beforeEach(() => {
    localStorage.clear();
    router = { navigate: jasmine.createSpy('navigate').and.resolveTo(true) };
  });

  function createAuthService(payload: any) {
    return {
      getCurrentUser: () => of(payload),
      isAdminUser: (user: any) => Boolean(user?.isAdmin ?? user?.user?.isAdmin ?? false)
    } as Partial<AuthService> as AuthService;
  }

  it('redirects administrators from the storefront to the dashboard', (done: DoneFn) => {
    const authService = createAuthService({ isAdmin: true });

    const guard = new AdminHomeRedirectGuard(authService, router as any);

    guard.canActivate().subscribe((result) => {
      expect(result).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
      done();
    });
  });

  it('accepts the backend response shape where the user is nested under a user key', (done: DoneFn) => {
    const authService = createAuthService({ user: { isAdmin: true } });

    const guard = new AdminHomeRedirectGuard(authService, router as any);

    guard.canActivate().subscribe((result) => {
      expect(result).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
      done();
    });
  });

  it('keeps non-admin users on the storefront', (done: DoneFn) => {
    const authService = createAuthService({ isAdmin: false });

    const guard = new AdminHomeRedirectGuard(authService, router as any);

    guard.canActivate().subscribe((result) => {
      expect(result).toBeTrue();
      expect(router.navigate).not.toHaveBeenCalled();
      done();
    });
  });

  it('keeps unauthenticated users on the storefront', (done: DoneFn) => {
    const authService = createAuthService(null);

    const guard = new AdminHomeRedirectGuard(authService, router as any);

    guard.canActivate().subscribe((result) => {
      expect(result).toBeTrue();
      expect(router.navigate).not.toHaveBeenCalled();
      done();
    });
  });

  it('denies direct dashboard access to non-admin users', (done: DoneFn) => {
    const authService = createAuthService({ isAdmin: false });

    const guard = new AdminDashboardGuard(authService, router as any);

    guard.canActivate().subscribe((result) => {
      expect(result).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
      done();
    });
  });

  it('treats an /auth/me failure as unauthenticated', (done: DoneFn) => {
    const authService = {
      getCurrentUser: () => throwError(() => new Error('Unexpected')),
      isAdminUser: () => false
    } as Partial<AuthService> as AuthService;

    const guard = new AdminDashboardGuard(authService, router as any);

    guard.canActivate().subscribe((result) => {
      expect(result).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
      done();
    });
  });
});
