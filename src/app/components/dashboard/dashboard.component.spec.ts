import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  it('delegates auth actions and navigation', () => {
    const router = { navigate: jasmine.createSpy('navigate') };
    const authService = {
      isLoggedIn: jasmine.createSpy('isLoggedIn').and.returnValue(true),
      loginWithGoogle: jasmine.createSpy('loginWithGoogle'),
      logout: jasmine.createSpy('logout')
    };
    const component = new DashboardComponent(router as any, authService as any);

    expect(component.isLoggedIn()).toBeTrue();
    component.login();
    component.logout();
    component.goToOrders();
    component.goToCart();
    component.goHome();

    expect(authService.loginWithGoogle).toHaveBeenCalled();
    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(router.navigate).toHaveBeenCalledWith(['/mis-compras']);
    expect(router.navigate).toHaveBeenCalledWith(['/carrito']);
  });
});