import { of, throwError } from 'rxjs';
import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
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

  it('FE-ACT-01 adds the selected quantity and exposes cart count and mini-summary CTA', () => {
    const addItemToOrder = jasmine.createSpy('addItemToOrder').and.returnValue(of({ success: true }));
    const component = new HomeComponent(
      { navigate: jasmine.createSpy('navigate').and.resolveTo(true) } as any,
      { filterProductsQuery: jasmine.createSpy().and.returnValue(of({ data: [], meta: { total: 0 } })) } as any,
      { addItemToOrder } as any,
      { isLoggedIn: () => true, loginWithGoogle: jasmine.createSpy('loginWithGoogle') } as any,
      dialogService as any
    );
    component.isLoggedIn.set(true);
    component['currentOrderId'] = 42;

    component.addToCart(5, 2);

    expect(addItemToOrder).toHaveBeenCalledWith(42, 5, 2);
    expect(component.cartFeedback()).toBe('Producto añadido al carrito');
    expect(component.cartItemCount()).toBe(2);
    expect(component.showCartMiniSummary()).toBeTrue();
    expect(component.getProductQuantity(5)).toBe(1);
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

  it('FE-DATA-01 persists a guest cart locally and synchronizes it after login', async () => {
    localStorage.removeItem('ladara-guest-cart');
    let loggedIn = false;
    const addItemToOrder = jasmine.createSpy('addItemToOrder').and.returnValue(of({ success: true }));
    const getCurrentOrder = jasmine.createSpy('getCurrentOrder').and.returnValue(of({
      success: true,
      data: [{ id: 42, items: [] }]
    }));
    const component = new HomeComponent(
      { navigate: jasmine.createSpy('navigate').and.resolveTo(true) } as any,
      { filterProductsQuery: jasmine.createSpy().and.returnValue(of({ data: [], meta: { total: 0 } })) } as any,
      { getCurrentOrder, addItemToOrder } as any,
      { isLoggedIn: () => loggedIn, loginWithGoogle: jasmine.createSpy('loginWithGoogle') } as any,
      dialogService as any
    );

    component.addToCart(5, 2);
    expect(JSON.parse(localStorage.getItem('ladara-guest-cart') || '[]')).toEqual([
      { productId: 5, quantity: 2 }
    ]);
    expect(component.cartItemCount()).toBe(2);

    loggedIn = true;
    component['handleAuthStateChange']();
    await Promise.resolve();
    await Promise.resolve();

    expect(getCurrentOrder).toHaveBeenCalled();
    expect(addItemToOrder).toHaveBeenCalledWith(42, 5, 2);
    expect(localStorage.getItem('ladara-guest-cart')).toBeNull();
    expect(component.guestCart()).toEqual([]);
  });

  it('loads categories and products and initializes product quantity state', async () => {
    const categories = jasmine.createSpy('getAllCategories').and.returnValue(of({ success: true, data: ['Health'] }));
    const filter = jasmine.createSpy('filterProductsQuery').and.returnValue(of({
      data: [{ id: 3, name: 'Mask', image: 'mask.jpg', price: 10 }],
      meta: { total: 1 }
    }));
    const component = new HomeComponent(
      { navigate: jasmine.createSpy('navigate').and.resolveTo(true) } as any,
      { getAllCategories: categories, filterProductsQuery: filter } as any,
      {} as any,
      { isLoggedIn: () => false } as any,
      dialogService as any
    );

    await component.ngOnInit();

    expect(component.categories()).toEqual(['Todas', 'Health']);
    expect(component.products()[0]).toEqual(jasmine.objectContaining({ id: 3, image: '/mask.jpg' }));
    expect(component.totalCount()).toBe(1);
    expect(component.getProductQuantity(3)).toBe(1);
    expect(component.isLoading()).toBeFalse();
  });

  it('normalizes malformed category/product payloads and clears products on request failure', async () => {
    const categories = jasmine.createSpy('getAllCategories').and.returnValue(of({ success: true, data: 'invalid' }));
    let filterCall = 0;
    const filter = () => filterCall++ === 0
      ? of({ data: { id: 1 }, meta: { total: 0 } })
      : throwError(() => new Error('offline'));
    const component = new HomeComponent(
      { navigate: jasmine.createSpy('navigate').and.resolveTo(true) } as any,
      { getAllCategories: categories, filterProductsQuery: filter } as any,
      {} as any,
      { isLoggedIn: () => false } as any,
      dialogService as any
    );
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await component.ngOnInit();
    expect(component.categories()).toEqual([]);
    expect(component.products()).toEqual([]);
    expect(component.totalCount()).toBe(0);
    component['fetchFilteredProducts']();
    expect(component.products()).toEqual([]);
    expect(consoleError).toHaveBeenCalled();
  });

  it('replaces pending debounced searches, clears the search, and enforces pagination bounds', fakeAsync(() => {
    const component = createComponent();
    const fetch = spyOn<any>(component, 'fetchFilteredProducts');
    component.totalCount.set(12);
    component.currentPage.set(2);
    component.onSearch({ target: { value: ' glove ' } } as any);
    tick(150);
    component.onSearch({ target: { value: ' mask ' } } as any);
    tick(299);
    expect(component.searchTerm()).toBe('');
    tick(1);
    expect(component.searchTerm()).toBe('mask');
    expect(component.currentPage()).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(1);

    component.clearSearchFilter();
    expect(component.searchTerm()).toBe('');
    expect(fetch).toHaveBeenCalledTimes(2);
    component.totalCount.set(0);
    component.goToPage(1);
    expect(component.currentPage()).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    component.totalCount.set(12);
    component.currentPage.set(1);
    component.previousPage();
    expect(fetch).toHaveBeenCalledTimes(2);
    component.nextPage();
    expect(component.currentPage()).toBe(2);
    component.currentPage.set(3);
    component.nextPage();
    expect(component.currentPage()).toBe(3);
  }));

  it('shows an error when adding an authenticated product fails', () => {
    const alert = jasmine.createSpy('alert').and.returnValue(Promise.resolve(true));
    const addItemToOrder = jasmine.createSpy('addItemToOrder').and.returnValue(throwError(() => new Error('offline')));
    const component = new HomeComponent(
      { navigate: jasmine.createSpy('navigate').and.resolveTo(true) } as any,
      { filterProductsQuery: jasmine.createSpy().and.returnValue(of({ data: [], meta: { total: 0 } })) } as any,
      { addItemToOrder } as any,
      { isLoggedIn: () => true } as any,
      { confirm: jasmine.createSpy('confirm'), alert } as any
    );
    jest.spyOn(console, 'error').mockImplementation(() => {});
    component.isLoggedIn.set(true);
    component['currentOrderId'] = 7;

    component.addToCart(5);

    expect(alert).toHaveBeenCalledWith(
      'No se pudo añadir el producto al carrito. Intenta nuevamente.',
      'Error al añadir producto',
      'warning'
    );
    expect(component.cartItemCount()).toBe(0);
  });

  it('preserves a guest cart after failed synchronization and reports local-storage failures', () => {
    localStorage.setItem('ladara-guest-cart', JSON.stringify([{ productId: 5, quantity: 2 }]));
    const addItemToOrder = jasmine.createSpy('addItemToOrder').and.returnValue(throwError(() => new Error('offline')));
    const component = new HomeComponent(
      { navigate: jasmine.createSpy('navigate').and.resolveTo(true) } as any,
      { filterProductsQuery: jasmine.createSpy().and.returnValue(of({ data: [], meta: { total: 0 } })) } as any,
      { addItemToOrder } as any,
      { isLoggedIn: () => true } as any,
      dialogService as any
    );
    jest.spyOn(console, 'error').mockImplementation(() => {});

    component['syncGuestCart'](42);
    expect(component.cartFeedback()).toContain('Se conservaron tus productos');
    expect(component.guestCart()).toEqual([{ productId: 5, quantity: 2 }]);

    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    component['persistGuestCart']([{ productId: 5, quantity: 3 }]);
    expect(component.cartFeedback()).toBe('No se pudo guardar el carrito en este dispositivo');
    setItem.mockRestore();
  });

  it('honors guest login confirmation accept and cancel outcomes', fakeAsync(() => {
    const loginWithGoogle = jasmine.createSpy('loginWithGoogle');
    let confirmCall = 0;
    const confirm = () => [Promise.resolve(true), Promise.resolve(false)][confirmCall++];
    const component = new HomeComponent(
      { navigate: jasmine.createSpy('navigate').and.resolveTo(true) } as any,
      { filterProductsQuery: jasmine.createSpy().and.returnValue(of({ data: [], meta: { total: 0 } })) } as any,
      {} as any,
      { isLoggedIn: () => false, loginWithGoogle } as any,
      { confirm, alert: jasmine.createSpy('alert') } as any
    );

    component.goToCart();
    flushMicrotasks();
    tick(1000);
    component.goToCart();
    flushMicrotasks();
    expect(loginWithGoogle).toHaveBeenCalledTimes(1);
  }));
});
