import { DashboardComponent } from './dashboard.component';
import { of } from 'rxjs';

describe('DashboardComponent', () => {
  it('delegates auth actions and navigation', () => {
    const router = { navigate: jasmine.createSpy('navigate') };
    const authService = {
      isLoggedIn: jasmine.createSpy('isLoggedIn').and.returnValue(true),
      loginWithGoogle: jasmine.createSpy('loginWithGoogle'),
      logout: jasmine.createSpy('logout')
    };
    const orderService = {
      getAdminDashboardSummary: jasmine.createSpy('getAdminDashboardSummary').and.returnValue(of({
        success: true,
        data: { pendingPaymentCount: 4, preparingCount: 2, completedLast30DaysCount: 8 }
      }))
    };
    const component = new DashboardComponent(router as any, authService as any, orderService as any);

    expect(component.isLoggedIn()).toBeTrue();
    component.ngOnInit();
    expect(orderService.getAdminDashboardSummary).toHaveBeenCalled();
    expect(component.metrics.map(metric => metric.value)).toEqual([4, 2, 8]);
    component.login();
    component.logout();
    component.goToOrders();
    component.goToCart();
    component.goHome();
    component.ngOnDestroy();

    expect(authService.loginWithGoogle).toHaveBeenCalled();
    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(router.navigate).toHaveBeenCalledWith(['/mis-compras']);
    expect(router.navigate).toHaveBeenCalledWith(['/carrito']);
  });

  it('offers a retry when dashboard metrics fail to load', () => {
    const component = new DashboardComponent(
      { navigate: jasmine.createSpy('navigate') } as any,
      { isLoggedIn: () => true } as any,
      { getAdminDashboardSummary: () => of({ success: false }) } as any
    );

    component.loadSummary();

    expect(component.error).toBe('La respuesta de indicadores no es válida.');
    expect(component.isLoading).toBeFalse();
  });
});