import { Component, computed, OnInit, signal, OnDestroy, HostListener } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, switchMap, forkJoin, map } from 'rxjs';
import { Product } from '../../services/models/product.models';
import { ProductService } from '../../services/product.service';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { DialogService } from '../../services/dialog.service';

// Constants
const DEFAULT_ITEMS_PER_PAGE = 4;
const SEARCH_DEBOUNCE_TIME = 300;
const TAX_RATE = 0.08;
const MAX_VISIBLE_PAGES = 7;
const ALL_CATEGORIES = 'Todas';
const DEFAULT_PRODUCT_IMAGE = '/vacuna.jpg';

// Interfaces
interface ProductFilters {
  name?: string;
  category?: string;
  limit: number;
  offset: number;
}

interface PaginationInfo {
  startItem: number;
  endItem: number;
  total: number;
}

interface GuestCartItem {
  productId: number;
  quantity: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],//, NgOptimizedImage],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  // Signals
  readonly searchTerm = signal('');
  readonly selectedCategory = signal('');
  readonly currentPage = signal(1);
  readonly itemsPerPage = signal(DEFAULT_ITEMS_PER_PAGE);
  readonly totalCount = signal(0);
  readonly categories = signal<string[]>([]);
  readonly products = signal<Product[]>([]);
  readonly isLoading = signal(false);
  readonly isLoggedIn = signal(false);
  readonly productQuantities = signal<Map<number, number>>(new Map());
  readonly cartFeedback = signal('');
  readonly guestCart = signal<GuestCartItem[]>(this.readGuestCart());
  readonly serverCartItemCount = signal(0);
  readonly showCartMiniSummary = signal(false);
  readonly cartItemCount = computed(() =>
    this.serverCartItemCount() + this.guestCart().reduce((count, item) => count + item.quantity, 0)
  );
  heroOpacity = signal(1);
  heroScale = signal(1);
  heroTranslateY = signal(0);
  isDropdownOpen = signal(false);

  // Private properties
  private currentOrderId: number | null = null;
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();
  private authStateIntervalId: ReturnType<typeof setInterval> | null = null;

  // Computed properties
  readonly totalPages = computed(() =>
    Math.ceil(this.totalCount() / this.itemsPerPage())
  );

  readonly paginationInfo = computed((): PaginationInfo => {
    const total = this.totalCount();
    const startItem = total === 0 ? 0 : (this.currentPage() - 1) * this.itemsPerPage() + 1;
    const endItem = Math.min(this.currentPage() * this.itemsPerPage(), total);
    return { startItem, endItem, total };
  });

  readonly visiblePages = computed(() => {
    return this.calculateVisiblePages(this.totalPages(), this.currentPage());
  });

  readonly hasActiveFilters = computed(() =>
    Boolean(this.searchTerm() || (this.selectedCategory() && this.selectedCategory() !== ALL_CATEGORIES))
  );

  constructor(
    private readonly router: Router,
    private readonly productService: ProductService,
    private readonly orderService: OrderService,
    private readonly authService: AuthService,
    private readonly dialogService: DialogService
  ) {
    this.setupSearchDebounce();
  }

  async ngOnInit(): Promise<void> {
    // Initialize login state and listen for changes
    this.updateLoginState();
    this.setupAuthStateListener();

    try {
      this.isLoading.set(true);
      await Promise.all([
        this.isLoggedIn() ? this.initializeCurrentOrder() : Promise.resolve(),
        this.loadCategories()
      ]);
      this.fetchFilteredProducts();
    } catch (error) {
      console.error('Error initializing component:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  ngOnDestroy(): void {
    if (this.authStateIntervalId) {
      clearInterval(this.authStateIntervalId);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  // HostListener for scroll events to adjust hero section
  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollY = window.scrollY || window.pageYOffset;
    // Fade out completely over 400px of scrolling
    const fadeDistance = 700;

    if (scrollY <= fadeDistance) {
      const progress = scrollY / fadeDistance;
      this.heroOpacity.set(1 - progress);
      this.heroScale.set(1 - progress * 0.25); // Scales down from 1 to 0.92
      this.heroTranslateY.set(scrollY * 0.1); // Parallax effect pushing it slightly down
    } else {
      this.heroOpacity.set(0);
      this.heroScale.set(0.95);
    }
  }

  scrollToGallery() {
    const galleryElement = document.getElementById('catalog');
    if (galleryElement) {
      const headerElement = document.querySelector<HTMLElement>('.sticky-header');
      const headerHeight = headerElement?.getBoundingClientRect().height ?? 0;
      const galleryTop = galleryElement.getBoundingClientRect().top + window.scrollY;
      const top = Math.max(0, galleryTop - headerHeight - 16);

      window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  // Search and Filter Methods
  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchSubject.next(target.value.trim());
  }

  onCategoryFilter(category: string): void {
    this.selectedCategory.set(category);
    this.isDropdownOpen.set(false);
    this.resetToFirstPage();
  }

  clearSearchFilter(): void {
    this.searchTerm.set('');
    this.searchSubject.next('');
    this.resetToFirstPage();
  }

  clearCategoryFilter(): void {
    this.selectedCategory.set('');
    this.resetToFirstPage();
  }

  clearFilters(): void {
    this.selectedCategory.set('');
    this.searchTerm.set('');
    this.searchSubject.next('');
    this.isDropdownOpen.set(false);
    this.resetToFirstPage();
  }

  toggleFilters(): void {
    this.isDropdownOpen.update(isOpen => !isOpen);
  }

  // Pagination Methods
  onItemsPerPageChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = parseInt(target.value, 10);

    if (this.isValidItemsPerPage(value)) {
      this.itemsPerPage.set(value);
      this.resetToFirstPage();
    }
  }

  goToPage(page: number): void {
    if (this.isValidPage(page)) {
      this.currentPage.set(page);
      this.fetchFilteredProducts();
    }
  }

  previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  goToCart(): void {
    // Check if user is logged in before accessing cart
    if (!this.isLoggedIn()) {
      this.dialogService.confirm(
        'Debes iniciar sesión para continuar.',
        'Inicio de sesión requerido'
      ).then(confirmed => {
        if (confirmed) {
          this.login();
        }
      });
      return;
    }

    this.router.navigate(['/carrito']);
  }

  goToOrders(): void {
    this.router.navigate(['/mis-compras']);
  }

  goHome(): void {
    this.router.navigate(['/']).then();
  }

  login(): void {
    this.authService.loginWithGoogle();

    // Show success message after login
    // Note: This might need to be moved to a callback after actual login success
    setTimeout(() => {
      if (this.isLoggedIn()) {
        this.dialogService.alert(
          'Has iniciado sesión correctamente',
          '¡Inicio de sesión exitoso!',
          'success',
          2000
        );
      }
    }, 1000);
  }

  logout(): void {
    this.authService.logout();
    this.updateLoginState();

    // Show logout success message
    this.dialogService.alert(
      'Has cerrado sesión exitosamente',
      '¡Sesión cerrada!',
      'success',
      2000
    );

    this.router.navigate(['/']).then();
  }

  // Product Methods
  addToCart(productId: number, quantity: number = 1, event?: Event): void {
    const product = this.products().find(candidate => candidate.id === productId);
    const availableStock = product?.stock;
    if (availableStock === 0) {
      this.cartFeedback.set('Producto sin stock disponible');
      return;
    }
    const maxQuantity = Math.min(100, availableStock ?? 100);
    const validQuantity = Math.max(1, Math.min(quantity, maxQuantity));
    if (validQuantity < quantity) {
      this.cartFeedback.set(`Stock disponible: ${availableStock} unidades`);
    }

    if (!this.isLoggedIn()) {
      this.addGuestCartItem(productId, validQuantity);
      this.showCartMiniSummary.set(true);
      this.animateCardToCart(productId, event);
      return;
    }

    this.addItemToCurrentOrder(productId, validQuantity, event);
  }

  private addItemToCurrentOrder(productId: number, quantity: number, event?: Event): void {
    const addItem = (orderId: number) => this.orderService.addItemToOrder(orderId, productId, quantity);
    const request = this.currentOrderId
      ? addItem(this.currentOrderId)
      : this.orderService.getCurrentOrder().pipe(
          takeUntil(this.destroy$),
          switchMap(response => {
            const currentOrder = Array.isArray(response?.data) ? response.data[0] : response?.data;
            const orderId = Number(currentOrder?.id);
            if (!Number.isInteger(orderId) || orderId < 1) {
              throw new Error('No active cart was returned by the backend');
            }
            this.currentOrderId = orderId;
            return addItem(orderId);
          })
        );

    request
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.serverCartItemCount.update(count => count + quantity);
            this.showCartMiniSummary.set(true);
            // Reset quantity to 1 after successful add
            this.updateProductQuantity(productId, 1);
            this.cartFeedback.set('Producto añadido al carrito');
            this.animateCardToCart(productId, event);
          } else {
            console.error('Failed to add item:', response.message);
          }
        },
        error: (error) => {
          console.error('Error adding item:', error);
          this.dialogService.alert(
            'No se pudo añadir el producto al carrito. Intenta nuevamente.',
            'Error al añadir producto',
            'warning'
          );
        }
      });
  }

  private animateCardToCart(productId: number, event?: Event): void {
    const trigger = event?.currentTarget as HTMLElement | null;
    const sourceCard = trigger?.closest<HTMLElement>('.product-card')
      ?? document.querySelector<HTMLElement>(`[data-product-id="${productId}"]`);
    const destination = document.querySelector<HTMLElement>('#cart-destination');

    if (!sourceCard || !destination) {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sourceRect = sourceCard.getBoundingClientRect();
    const destinationRect = destination.getBoundingClientRect();
    const flyingCard = sourceCard.cloneNode(true) as HTMLElement;
    const startX = sourceRect.left;
    const startY = sourceRect.top;
    const sourceCenterX = sourceRect.left + sourceRect.width / 2;
    const sourceCenterY = sourceRect.top + sourceRect.height / 2;
    const destinationCenterX = destinationRect.left + destinationRect.width / 2;
    const destinationCenterY = destinationRect.top + destinationRect.height / 2;
    const travelX = destinationCenterX - sourceCenterX;
    const travelY = destinationCenterY - sourceCenterY;

    flyingCard.classList.add('product-card-flight');
    Object.assign(flyingCard.style, {
      left: `${startX}px`,
      top: `${startY}px`,
      width: `${sourceRect.width}px`,
      height: `${sourceRect.height}px`
    });
    document.body.appendChild(flyingCard);

    const animation = flyingCard.animate([
      { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 },
      {
        transform: prefersReducedMotion
          ? 'translate3d(0, 0, 0) scale(1)'
          : `translate3d(${travelX}px, ${travelY}px, 0) scale(0.04)`,
        opacity: prefersReducedMotion ? 0 : 0.15
      }
    ], {
      duration: prefersReducedMotion ? 180 : 650,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'forwards'
    });

    animation.finished.then(() => flyingCard.remove()).catch(() => flyingCard.remove());
  }

  updateProductQuantity(productId: number, quantity: number): void {
    const minQuantity = 1;
    const product = this.products().find(candidate => candidate.id === productId);
    const stockLimit = product?.stock;
    const maxQuantity = stockLimit == null ? 100 : Math.min(100, stockLimit);

    if (maxQuantity < minQuantity) {
      this.cartFeedback.set('Producto sin stock disponible');
      return;
    }

    if (quantity > maxQuantity) {
      this.cartFeedback.set(`Stock máximo disponible: ${maxQuantity} unidades`);
      this.dialogService.alert(
        `Solo hay ${maxQuantity} unidades disponibles`,
        'Límite de stock',
        'warning'
      );
    }

    const validQuantity = Math.max(minQuantity, Math.min(maxQuantity, quantity));

    this.productQuantities.update(quantities => {
      const newQuantities = new Map(quantities);
      newQuantities.set(productId, validQuantity);
      return newQuantities;
    });
  }

  getProductMaxQuantity(productId: number): number {
    const stock = this.products().find(product => product.id === productId)?.stock;
    return Math.max(0, Math.min(100, stock ?? 100));
  }

  getProductQuantity(productId: number): number {
    return this.productQuantities().get(productId) || 1;
  }

  onQuantityInputChange(productId: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = parseInt(target.value, 10);

    if (!isNaN(value) && value >= 1) {
      this.updateProductQuantity(productId, value);
      target.value = this.getProductQuantity(productId).toString();
    } else {
      // Reset to current value if invalid
      target.value = this.getProductQuantity(productId).toString();
    }
  }

  getDiscountPercentage(price: number, discountedPrice: number): number {
    return Math.round(((price - discountedPrice) / price) * 100);
  }

  getProductImage(product: Product | null | undefined): string {
    return this.normalizeProductImage(product?.image);
  }

  private normalizeProductImage(image?: string | null): string {
    const safeImage = image?.trim();

    if (!safeImage) {
      return DEFAULT_PRODUCT_IMAGE;
    }

    if (
      safeImage.startsWith('http://') ||
      safeImage.startsWith('https://') ||
      safeImage.startsWith('/') ||
      safeImage.startsWith('data:')
    ) {
      return safeImage;
    }

    return `/${safeImage.replace(/^\.?\//, '')}`;
  }

  // Private Helper Methods
  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_TIME),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.searchTerm.set(searchTerm);
        this.resetToFirstPage();
      });
  }

  private setupAuthStateListener(): void {
    // Listen for storage changes to detect login/logout from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key === 'token') {
        this.handleAuthStateChange();
      }
    });

    // Set up periodic check for auth state changes
    this.authStateIntervalId = setInterval(() => {
      this.handleAuthStateChange();
    }, 1000);
  }

  private updateLoginState(): void {
    this.isLoggedIn.set(this.authService.isLoggedIn());
  }

  private handleAuthStateChange(): void {
    const wasLoggedIn = this.isLoggedIn();
    const isLoggedIn = this.authService.isLoggedIn();
    this.isLoggedIn.set(isLoggedIn);

    if (!isLoggedIn) {
      this.currentOrderId = null;
      this.serverCartItemCount.set(0);
      return;
    }

    if (!wasLoggedIn && isLoggedIn) {
      void this.initializeCurrentOrder();
    }
  }

  private async initializeCurrentOrder(): Promise<void> {
    return new Promise((resolve) => {
      this.orderService.getCurrentOrder()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (order: any) => {
            const currentOrder = Array.isArray(order?.data) ? order.data[0] : order?.data;
            this.currentOrderId = currentOrder?.id || null;
            this.serverCartItemCount.set((currentOrder?.items || []).reduce(
              (count: number, item: { quantity?: number }) => count + Number(item.quantity || 0), 0
            ));
            if (this.currentOrderId && this.guestCart().length) {
              this.syncGuestCart(this.currentOrderId);
            }
            resolve();
          },
          error: (error) => {
            console.error('Error fetching current order:', error);
            this.currentOrderId = null;
            resolve();
          }
        });
    });
  }

  private loadCategories(): Promise<void> {
    return new Promise((resolve) => {
      this.productService.getAllCategories()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              this.categories.set([ALL_CATEGORIES, ...response.data]);
            }
            resolve();
          },
          error: (error) => {
            console.error('Error fetching categories:', error);
            resolve();
          }
        });
    });
  }

  private fetchFilteredProducts(): void {
    const filters = this.buildProductFilters();

    this.productService.filterProductsQuery(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const normalizedProducts = (response.data || []).map(product => ({
            ...product,
            image: this.normalizeProductImage(product.image)
          }));

          this.products.set(normalizedProducts);
          this.totalCount.set(response.meta?.total || 0);
          // Initialize quantities for new products
          this.initializeProductQuantities(normalizedProducts);
        },
        error: (error) => {
          console.error('Error fetching products:', error);
          this.products.set([]);
          this.totalCount.set(0);
        }
      });
  }

  private initializeProductQuantities(products: Product[]): void {
    this.productQuantities.update(quantities => {
      const newQuantities = new Map(quantities);
      products.forEach(product => {
        if (!newQuantities.has(product.id)) {
          newQuantities.set(product.id, 1);
        }
      });
      return newQuantities;
    });
  }

  private buildProductFilters(): ProductFilters {
    const filters: ProductFilters = {
      limit: this.itemsPerPage(),
      offset: (this.currentPage() - 1) * this.itemsPerPage()
    };

    if (this.searchTerm()) {
      filters.name = this.searchTerm();
    }

    if (this.selectedCategory() && this.selectedCategory() !== ALL_CATEGORIES) {
      filters.category = this.selectedCategory();
    }

    return filters;
  }

  private calculateVisiblePages(totalPages: number, currentPage: number): (number | string)[] {
    const pages: (number | string)[] = [];

    if (totalPages <= MAX_VISIBLE_PAGES) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    // Complex pagination logic for many pages
    pages.push(1);

    if (currentPage > 4) {
      pages.push('...');
    }

    const start = Math.max(2, currentPage - 2);
    const end = Math.min(totalPages - 1, currentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 3) {
      pages.push('...');
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  }

  private resetToFirstPage(): void {
    this.currentPage.set(1);
    this.fetchFilteredProducts();
  }

  private isValidItemsPerPage(value: number): boolean {
    return !isNaN(value) && value > 0;
  }

  private isValidPage(page: number): boolean {
    return page >= 1 && page <= this.totalPages();
  }

  private addGuestCartItem(productId: number, quantity: number): void {
    const currentItems = this.guestCart();
    const existing = currentItems.find(item => item.productId === productId);
    const maxQuantity = this.getProductMaxQuantity(productId);
    const nextQuantity = Math.min(maxQuantity, (existing?.quantity || 0) + quantity);
    if (existing && nextQuantity === existing.quantity) {
      this.cartFeedback.set(`Stock máximo disponible: ${maxQuantity} unidades`);
      return;
    }
    const nextItems = existing
      ? currentItems.map(item => item.productId === productId
          ? { ...item, quantity: nextQuantity }
          : item)
      : [...currentItems, { productId, quantity: nextQuantity }];
    this.guestCart.set(nextItems);
    this.persistGuestCart(nextItems);
    this.cartFeedback.set('Producto añadido al carrito');
  }

  private readGuestCart(): GuestCartItem[] {
    try {
      const stored = localStorage.getItem('ladara-guest-cart');
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed)
        ? parsed.filter((item): item is GuestCartItem =>
            Number.isInteger(item?.productId) && item.productId > 0 &&
            Number.isInteger(item?.quantity) && item.quantity > 0
          )
        : [];
    } catch {
      return [];
    }
  }

  private persistGuestCart(items: GuestCartItem[]): void {
    try {
      if (items.length) {
        localStorage.setItem('ladara-guest-cart', JSON.stringify(items));
      } else {
        localStorage.removeItem('ladara-guest-cart');
      }
    } catch (error) {
      console.error('Unable to persist guest cart:', error);
      this.cartFeedback.set('No se pudo guardar el carrito en este dispositivo');
    }
  }

  private syncGuestCart(orderId: number): void {
    const guestItems = [...this.guestCart()];
    if (!guestItems.length) return;

    forkJoin(guestItems.map(item =>
      this.orderService.addItemToOrder(orderId, item.productId, item.quantity)
    )).pipe(
      map(responses => ({
        success: responses.every(response => response.success),
        message: responses.find(response => !response.success)?.message
      })),
      takeUntil(this.destroy$)
    ).subscribe({
      next: response => {
        if (!response.success) {
          this.cartFeedback.set(response.message || 'No se pudo sincronizar el carrito');
          return;
        }
        this.guestCart.set([]);
        this.persistGuestCart([]);
        this.serverCartItemCount.update(count => count + guestItems.reduce((sum, item) => sum + item.quantity, 0));
        this.cartFeedback.set('Tu carrito de invitado se sincronizó');
      },
      error: error => {
        console.error('Unable to synchronize guest cart:', error);
        this.cartFeedback.set('No se pudo sincronizar el carrito. Se conservaron tus productos.');
      }
    });
  }
}
