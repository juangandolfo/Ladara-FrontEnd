import { of } from 'rxjs';
import { fakeAsync, tick } from '@angular/core/testing';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
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
      } as any
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
});
