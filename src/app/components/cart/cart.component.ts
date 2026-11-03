import { Component, computed, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, takeUntil, EMPTY, of } from 'rxjs';
import { catchError, concatMap, map } from 'rxjs/operators';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { DialogService } from '../../services/dialog.service';
import { ProductService } from '../../services/product.service';
import { Product } from '../../services/models/product.models';

// Constants
const TAX_RATE = 0.08;
const MIN_QUANTITY = 1;
const DEFAULT_PRODUCT_IMAGE = '/vacuna.jpg';
const CART_REFRESH_INTERVAL = 5000;

// Interfaces
export interface CartItem {
  id: number;
  name: string;
  price: number;
  discountedPrice?: number;
  quantity: number;
  category: string;
  image?: string;
  description?: string;
  itemId?: number; // Backend item ID for API calls
  productId?: number; // Product ID for backend
  stock?: number;
  previousPrice?: number;
  priceChanged?: boolean;
}

interface CartSummary {
  subtotal: number;
  totalItems: number;
  totalSavings: number;
  couponCode: string;
  discount: number;
  tax: number;
  envio: number;
  total: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface QuantityUpdate {
  itemId: number;
  cartItemId: number;
  quantity: number;
}

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css'],
  imports: [CommonModule],
  standalone: true
})
export class CartComponent implements OnInit, OnDestroy {
  // Signals
  readonly cartItems = signal<CartItem[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly isLoggedIn = signal<boolean>(true); 
  readonly activeCoupon = signal('');
  readonly couponError = signal('');
  readonly backendCouponDiscount = signal<number | null>(null);
  readonly removingItemId = signal<number | null>(null);
  readonly recommendedProducts = signal<Product[]>([]);
  readonly envio = signal(0);
  readonly authoritativeTotal = signal<number | null>(null);

  // Private properties
  private orderId: number | null = null;
  private readonly destroy$ = new Subject<void>();
  private readonly quantityQueues = new Map<number, Subject<QuantityUpdate>>();
  private readonly pendingQuantities = new Map<number, number>();
  private refreshIntervalId: ReturnType<typeof setInterval> | null = null;

  // Computed properties
  readonly cartSummary = computed((): CartSummary => {
    const items = this.cartItems();

    const subtotal = this.calculateSubtotal(items);
    const totalItems = this.calculateTotalItems(items);
    const totalSavings = this.calculateTotalSavings(items);
    const couponCode = this.activeCoupon();
    const discount = this.backendCouponDiscount() ?? (this.validateCouponCode(couponCode) ? subtotal * 0.1 : 0);
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = taxableAmount * TAX_RATE;
    const envio = this.envio();
    const calculatedTotal = taxableAmount + tax + envio;
    const total = this.authoritativeTotal() ?? calculatedTotal;

    return { subtotal, totalItems, totalSavings, couponCode, discount, tax, envio, total };
  });

  readonly subtotal = computed(() => this.cartSummary().subtotal);
  readonly totalItems = computed(() => this.cartSummary().totalItems);
  readonly totalSavings = computed(() => this.cartSummary().totalSavings);
  readonly couponDiscount = computed(() => this.cartSummary().discount);
  readonly tax = computed(() => this.cartSummary().tax);
  readonly deliveryCost = computed(() => this.cartSummary().envio);
  readonly total = computed(() => this.cartSummary().total);

  readonly isEmpty = computed(() => this.cartItems().length === 0);
  readonly hasItems = computed(() => !this.isEmpty());

  constructor(
    private readonly router: Router,
    private readonly orderService: OrderService,
    private readonly authService: AuthService,
    private readonly dialogService: DialogService,
    private readonly productService?: ProductService
  ) {}

   async ngOnInit(): Promise<void> {
    this.updateLoginState();
    this.setupAuthStateListener();

    if (this.isLoggedIn()) {
      this.loadCurrentOrder();
    } else {
      this.error.set('Tu sesión ha expirado. Inicia sesión para cargar el carrito.');
    }

    this.refreshIntervalId = setInterval(() => {
      if (this.isLoggedIn() && !document.hidden && !this.isLoading()) {
        this.loadCurrentOrder(false);
      }
    }, CART_REFRESH_INTERVAL);
  } 

  ngOnDestroy(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Public Methods
  updateQuantity(itemId: number, newQuantity: number): void {
    const item = this.findCartItem(itemId);
    if (!item?.itemId) {
      this.handleError('Item ID not found for update');
      return;
    }

    const currentQuantity = this.pendingQuantities.get(item.itemId) ?? item.quantity;
    const requestedQuantity = Math.max(0, currentQuantity + newQuantity);
    const stockLimit = item.stock;
    if (stockLimit != null && requestedQuantity > stockLimit) {
      this.handleError(`El stock disponible para ${item.name} es de ${stockLimit} unidades`);
      if (currentQuantity >= stockLimit) return;
      this.queueQuantityUpdate(item, stockLimit);
      return;
    }
    this.queueQuantityUpdate(item, requestedQuantity);
  }

  removeItem(itemId: number): void {
    const item = this.findCartItem(itemId);
    if (!item?.itemId) {
      this.handleError('Item ID not found for backend deletion');
      return;
    }

    this.removingItemId.set(itemId);
    setTimeout(() => {
      this.queueQuantityUpdate(item, 0);
      this.removingItemId.set(null);
    }, 250);
  }

  clearCart(): void {
    const items = this.cartItems();
    if (items.length === 0) return;

    this.orderService.clearCurrentCart()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cartItems.set([]);
          this.loadRecommendations();
        },
        error: error => {
          this.handleError('Error clearing cart', error);
          this.cartItems.set([]);
          this.loadRecommendations();
        }
      });
  }

  onCouponClick(): void {
    this.dialogService.prompt(
      'Ingresa tu código de cupón:',
      'Cupón de descuento'
    ).then(code => {
      if (code) this.applyCouponCode(code.trim());
    });
  }

  applyCouponCode(code: string): void {
    this.couponError.set('');
    this.backendCouponDiscount.set(null);
    const validator = (this.orderService as OrderService & {
      validateCoupon?: (coupon: string) => any
    }).validateCoupon;

    if (!validator) {
      if (this.validateCouponCode(code)) {
        this.activeCoupon.set(code);
      } else {
        this.couponError.set('El código de cupón no es válido');
      }
      return;
    }

    validator.call(this.orderService, code).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        const data = response?.data;
        if (!response?.success || data?.valid === false) {
          this.couponError.set(response?.message || data?.message || 'El código de cupón no es válido');
          this.activeCoupon.set('');
          return;
        }
        const discount = this.parseOptionalPrice(data?.discountAmount ?? data?.discount);
        if (discount == null || discount <= 0) {
          this.couponError.set('El servidor devolvió un descuento inválido');
          return;
        }
        this.activeCoupon.set(data.code || code);
        this.backendCouponDiscount.set(Math.min(this.subtotal(), discount));
      },
      error: () => this.couponError.set('No se pudo validar el cupón. Intenta nuevamente.')
    });
  }

  onRemoveCoupon(): void {
    this.activeCoupon.set('');
    this.backendCouponDiscount.set(null);
    this.couponError.set('');
  }

  validateCouponCode(code: string): boolean {
    return code === 'DISCOUNT10';
  }

  // Navigation Methods
  goHome(): void {
    this.router.navigate(['/']);
  }

  goToOrders(): void {
    if (!this.authService.isLoggedIn()) {
      this.dialogService.alert(
        'Por favor inicia sesión para ver tus órdenes',
        'Inicio de sesión requerido',
        'warning'
      );
      this.router.navigate(['/']);
      return;
    }
    this.router.navigate(['/mis-compras']);
  }

  goToCheckout(): void {
    if (this.isEmpty()) {
      this.handleError('Cannot proceed to checkout with empty cart');
      return;
    }
    this.router.navigate(['/checkout']);
  }

  /* Private Methods */
  /* authentication and order loading logic */
  private setupAuthStateListener(): void {
    // Listen for storage changes to detect login/logout from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key === 'token') {
        this.updateLoginState();
      }
    });

    // Set up periodic check for auth state changes
    setInterval(() => {
      this.updateLoginState();
    }, 1000);
  }
  
  private updateLoginState(): void {
    this.isLoggedIn.set(this.authService.isLoggedIn());
  }

  private loadCurrentOrder(showLoading = true): void {
    if (showLoading) {
      this.isLoading.set(true);
    }
    this.error.set(null);

    this.orderService.getCurrentOrder()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          const message = error instanceof HttpErrorResponse && error.status === 403
            ? 'Tu sesión ha expirado. Inicia sesión para cargar el carrito.'
            : 'Error loading current order';
          this.handleError(message, error);
          if (showLoading) {
            this.isLoading.set(false);
          }
          return EMPTY;
        })
      )
      .subscribe({
        next: (response) => {
          this.processOrderResponse(response);
          if (showLoading) {
            this.isLoading.set(false);
          }
        },
        error: () => {
          if (showLoading) {
            this.isLoading.set(false);
          }
        }
      });
  }

  private processOrderResponse(response: ApiResponse<any[] | any>): void {
    const orders = Array.isArray(response.data) ? response.data : response.data ? [response.data] : [];

    if (!response.success || orders.length === 0) {
      console.warn('No current order found or failed to load');
      for (const [itemId, pendingQuantity] of this.pendingQuantities) {
        if (pendingQuantity === 0) {
          this.pendingQuantities.delete(itemId);
        }
      }
      this.orderId = null;
      this.envio.set(0);
      this.authoritativeTotal.set(null);
      this.cartItems.set([]);
      this.loadRecommendations();
      return;
    }

    const currentOrder = orders[0];
    this.orderId = currentOrder.id;
    this.envio.set(Math.max(0, this.parsePrice(currentOrder.shippingCost)));
    this.authoritativeTotal.set(this.parseOptionalPrice(currentOrder.total));

    const serverItems = currentOrder.items || [];
    this.reconcilePendingQuantities(serverItems);
    const mappedItems = this.mapOrderItemsToCartItems(serverItems)
      .filter(item => item.itemId == null || !this.pendingQuantities.has(item.itemId) || (this.pendingQuantities.get(item.itemId) ?? 0) > 0)
      .map(item => {
        const pendingQuantity = item.itemId == null ? undefined : this.pendingQuantities.get(item.itemId);
        return pendingQuantity == null ? item : { ...item, quantity: pendingQuantity };
      });
    this.cartItems.set(mappedItems);
    if (mappedItems.length === 0) this.loadRecommendations();
  }

  private reconcilePendingQuantities(serverItems: any[]): void {
    for (const [itemId, pendingQuantity] of this.pendingQuantities) {
      const serverItem = serverItems.find(item => Number(item.id) === itemId);
      const isConfirmed = pendingQuantity === 0
        ? !serverItem
        : Number(serverItem?.quantity) === pendingQuantity;

      if (isConfirmed) {
        this.pendingQuantities.delete(itemId);
      }
    }
  }

  private mapOrderItemsToCartItems(orderItems: any[]): CartItem[] {
    return orderItems.map(item => ({
      id: item.id,
      name: item.product.name,
      price: this.parsePrice(item.product.price),
      previousPrice: this.parseOptionalPrice(item.price) !== this.parsePrice(item.product.price)
        ? this.parseOptionalPrice(item.price) ?? undefined
        : undefined,
      priceChanged: this.parseOptionalPrice(item.price) != null &&
        this.parseOptionalPrice(item.price) !== this.parsePrice(item.product.price),
      stock: this.parseOptionalPrice(item.product.stock) ?? undefined,
      quantity: item.quantity,
      category: item.product.category,
      image: this.normalizeProductImage(item.product.image),
      description: item.product.description,
      itemId: item.id,
      productId: item.product.id
    }));
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

  private queueQuantityUpdate(item: CartItem, quantity: number): void {
    const itemId = item.itemId;
    if (itemId == null) {
      this.handleError('Item ID not found for update');
      return;
    }

    this.pendingQuantities.set(itemId, quantity);
    this.updateLocalQuantity(item.id, quantity);

    let queue = this.quantityQueues.get(itemId);
    if (!queue) {
      queue = new Subject<QuantityUpdate>();
      this.quantityQueues.set(itemId, queue);
      queue.pipe(
        concatMap(update => this.orderService.updateItemQuantity(update.itemId, update.quantity).pipe(
          map(response => ({ response, update })),
          catchError(error => {
            this.handleError('Error updating quantity', error);
            return EMPTY;
          })
        )),
        takeUntil(this.destroy$)
      ).subscribe({
        next: result => {
          if (!result.response.success) {
            this.handleError(`Failed to update quantity: ${result.response.message}`);
            return;
          }

          const latestQuantity = this.pendingQuantities.get(itemId);
          if (latestQuantity === result.update.quantity) {
            this.loadCurrentOrder(false);
          }
        }
      });
    }

    queue.next({ itemId, cartItemId: item.id, quantity });
  }

  // Utility Methods
  private findCartItem(itemId: number): CartItem | undefined {
    return this.cartItems().find(item => item.id === itemId);
  }

  private updateLocalQuantity(itemId: number, newQuantity: number): void {
    if (newQuantity <= 0) {
      this.cartItems.update(items => items.filter(item => item.id !== itemId));
      if (this.cartItems().length === 0) this.loadRecommendations();
      return;
    }

    this.cartItems.update(items => items.map(item =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ));
  }

  private loadRecommendations(): void {
    if (!this.productService) return;
    this.productService.filterProductsQuery({ limit: 4, offset: 0 }).pipe(
      catchError(() => of({ success: false, data: [], meta: { total: 0, count: 0, appliedFilters: {} } } as any)),
      takeUntil(this.destroy$)
    ).subscribe(response => this.recommendedProducts.set(response.success ? response.data || [] : []));
  }

  private calculateSubtotal(items: CartItem[]): number {
    return items.reduce((total, item) => {
      const price = item.discountedPrice ?? item.price;
      return total + (price * item.quantity);
    }, 0);
  }

  private calculateTotalItems(items: CartItem[]): number {
    return items.reduce((total, item) => total + item.quantity, 0);
  }

  private calculateTotalSavings(items: CartItem[]): number {
    return items.reduce((total, item) => {
      if (item.discountedPrice && item.discountedPrice < item.price) {
        return total + ((item.price - item.discountedPrice) * item.quantity);
      }
      return total;
    }, 0);
  }

  private parsePrice(price?: string | number): number {
    const parsed = typeof price === 'string' ? parseFloat(price) : price;
    return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : 0;
  }

  private parseOptionalPrice(price?: string | number): number | null {
    const parsed = typeof price === 'string' ? parseFloat(price) : price;
    return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
  }

  private handleError(message: string, error?: any): void {
    console.error(message, error);
    this.error.set(message);

    // Clear error after 5 seconds
    setTimeout(() => this.error.set(null), 5000);
  }
}
