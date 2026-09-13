import { of } from 'rxjs';
import { fakeAsync, tick } from '@angular/core/testing';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  const dialogService = {
    confirm: jasmine.createSpy('confirm').and.returnValue(Promise.resolve(false)),
    alert: jasmine.createSpy('alert').and.returnValue(Promise.resolve(true))
  };

  function createComponent(): HomeComponent {
    return new HomeComponent(
      { navigate: jasmine.createSpy('navigate').and.resolveTo(true) } as any,
      {
        filterProductsQuery: jasmine.createSpy('filterProductsQuery').and.returnValue(
          of({ data: [], meta: { total: 0, count: 0, appliedFilters: {} } })
        ),
        getAllCategories: jasmine.createSpy('getAllCategories').and.returnValue(
          of({ success: true, data: [] })
        )
      } as any,
      {
        getCurrentOrder: jasmine.createSpy('getCurrentOrder').and.returnValue(of({ data: [] }))
      } as any,
      {
        isLoggedIn: () => false,
        loginWithGoogle: jasmine.createSpy('loginWithGoogle'),
        logout: jasmine.createSpy('logout')
      } as any,
      dialogService as any
    );
  }

  it('should clear the active search filter through a dedicated method and refetch products', fakeAsync(() => {
    const component = createComponent();
    const fetchSpy = spyOn<any>(component, 'fetchFilteredProducts');

    component.searchTerm.set('guantes');
    component.clearSearchFilter();
    tick();

    expect(component.searchTerm()).toBe('');
    expect(fetchSpy).toHaveBeenCalled();
  }));

  it('should debounce search input updates before applying the filter', fakeAsync(() => {
    const component = createComponent();
    const fetchSpy = spyOn<any>(component, 'fetchFilteredProducts');

    component.onSearch({ target: { value: 'mascarillas' } } as any);

    expect(component.searchTerm()).toBe('');
    tick(350);

    expect(component.searchTerm()).toBe('mascarillas');
    expect(fetchSpy).toHaveBeenCalled();
  }));

  it('should toggle the category dropdown', () => {
    const component = createComponent();

    component.toggleFilters();
    expect(component.isDropdownOpen()).toBeTrue();

    component.toggleFilters();
    expect(component.isDropdownOpen()).toBeFalse();
  });

  it('opens the login confirmation when a logged-out user opens the cart', () => {
    const component = createComponent();

    component.goToCart();

    expect(dialogService.confirm).toHaveBeenCalledWith(
      'Debes iniciar sesión para continuar.',
      'Inicio de sesión requerido'
    );
  });

  it('should apply the selected category and refetch from the first page', () => {
    const component = createComponent();
    const fetchSpy = spyOn<any>(component, 'fetchFilteredProducts');
    component.currentPage.set(3);

    component.onCategoryFilter('Equipamiento');

    expect(component.selectedCategory()).toBe('Equipamiento');
    expect(component.currentPage()).toBe(1);
    expect(component.isDropdownOpen()).toBeFalse();
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('calculates pagination information and visible pages', () => {
    const component = createComponent();
    component.itemsPerPage.set(8);
    component.totalCount.set(100);
    component.currentPage.set(5);

    expect(component.totalPages()).toBe(13);
    expect(component.paginationInfo()).toEqual({ startItem: 33, endItem: 40, total: 100 });
    expect(component.visiblePages()).toEqual([1, '...', 3, 4, 5, 6, 7, '...', 13]);
  });

  it('changes pages without repositioning the viewport', () => {
    const component = createComponent();
    component.totalCount.set(16);
    const fetchSpy = spyOn<any>(component, 'fetchFilteredProducts');

    component.goToPage(2);

    expect(component.currentPage()).toBe(2);
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('clamps product quantities and handles invalid input', () => {
    const component = createComponent();
    component.updateProductQuantity(4, 0);
    expect(component.getProductQuantity(4)).toBe(1);
    component.updateProductQuantity(4, 100);
    expect(component.getProductQuantity(4)).toBe(100);

    const input = { value: 'not-a-number' } as HTMLInputElement;
    component.onQuantityInputChange(4, { target: input } as any);
    expect(input.value).toBe('100');
  });

  it('normalizes product images and calculates discounts', () => {
    const component = createComponent();
    expect(component.getProductImage(undefined)).toBe('/vacuna.jpg');
    expect(component.getProductImage({ image: 'products/mask.jpg' } as any)).toBe('/products/mask.jpg');
    expect(component.getProductImage({ image: 'https://cdn.example/mask.jpg' } as any)).toBe('https://cdn.example/mask.jpg');
    expect(component.getDiscountPercentage(100, 75)).toBe(25);
  });

  it('reloads the current order when a user logs in after logout', () => {
    let loggedIn = false;
    const currentOrder = jasmine.createSpy('getCurrentOrder').and.returnValue(
      of({ data: [{ id: 42 }] })
    );
    const component = new HomeComponent(
      { navigate: jasmine.createSpy('navigate').and.resolveTo(true) } as any,
      { filterProductsQuery: jasmine.createSpy().and.returnValue(of({ data: [], meta: { total: 0 } })) } as any,
      { getCurrentOrder: currentOrder } as any,
      {
        isLoggedIn: () => loggedIn,
        loginWithGoogle: jasmine.createSpy('loginWithGoogle'),
        logout: jasmine.createSpy('logout')
      } as any,
      dialogService as any
    );

    component['handleAuthStateChange']();
    loggedIn = true;
    component['handleAuthStateChange']();

    expect(currentOrder).toHaveBeenCalled();
    expect(component['currentOrderId']).toBe(42);
  });
});
