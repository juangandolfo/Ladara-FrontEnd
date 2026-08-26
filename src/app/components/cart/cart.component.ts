import { Component, computed, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil, forkJoin, EMPTY, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';

// Constants
const TAX_RATE = 0.08;
const MIN_QUANTITY = 1;
const DEFAULT_PRODUCT_IMAGE = '/vacuna.jpg';

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
}

interface CartSummary {
  subtotal: number;
  totalItems: number;
  totalSavings: number;
  tax: number;
  total: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
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

  // Private properties
  private orderId: number | null = null;
  private readonly destroy$ = new Subject<void>();

  // Computed properties
  readonly cartSummary = computed((): CartSummary => {
    const items = this.cartItems();

    const subtotal = this.calculateSubtotal(items);
    const totalItems = this.calculateTotalItems(items);
    const totalSavings = this.calculateTotalSavings(items);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;

    return { subtotal, totalItems, totalSavings, tax, total };
  });

  readonly subtotal = computed(() => this.cartSummary().subtotal);
  readonly totalItems = computed(() => this.cartSummary().totalItems);
  readonly totalSavings = computed(() => this.cartSummary().totalSavings);
  readonly tax = computed(() => this.cartSummary().tax);
  readonly total = computed(() => this.cartSummary().total);

  readonly isEmpty = computed(() => this.cartItems().length === 0);
  readonly hasItems = computed(() => !this.isEmpty());

  constructor(
    private readonly router: Router,
    private readonly orderService: OrderService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadCurrentOrder();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Public Methods
  updateQuantity(itemId: number, newQuantity: number): void {
    const item = this.findCartItem(itemId);
    if (!item?.productId) {
      this.handleError('Product ID not found for update');
      return;
    }

    if (newQuantity < 0) {
      this.decrementQuantity(item);
      return;
    }

    this.performQuantityUpdate(item, newQuantity);
  }

  removeItem(itemId: number): void {
    const item = this.findCartItem(itemId);
    if (!item?.itemId) {
      this.handleError('Item ID not found for backend deletion');
      return;
    }

    this.orderService.deleteItemFromOrder(item.itemId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.handleError('Error removing item', error);
          return EMPTY;
        })
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.cartItems.update(items => items.filter(i => i.id !== itemId));
          } else {
            this.handleError(`Failed to remove item: ${response.message}`);
          }
        }
      });
  }

  clearCart(): void {
    const items = this.cartItems();
    if (items.length === 0) return;

    const deleteOperations = this.createBulkDeleteOperations(items);
    this.performBulkDelete(deleteOperations);
  }

  proceedToCheckout(): void {
    if (this.isEmpty()) {
      this.handleError('Cannot proceed to checkout with empty cart');
      return;
    }

    console.log('Proceeding to checkout with items:', this.cartItems());
    // TODO: Implement checkout navigation
  }

  // Navigation Methods
  goHome(): void {
    this.router.navigate(['/']);
  }

  goToOrders(): void {
    if (!this.authService.isLoggedIn()) {
      alert('Por favor inicia sesión para ver tus órdenes');
      this.router.navigate(['/']);
      return;
    }
    this.router.navigate(['/my-orders']);
  }

  // Private Methods
  private loadCurrentOrder(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.orderService.getCurrentOrder()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.handleError('Error loading current order', error);
          return EMPTY;
        })
      )
      .subscribe({
        next: (response) => {
          this.processOrderResponse(response);
          this.isLoading.set(false);
        }
      });
  }

  private processOrderResponse(response: ApiResponse<any[]>): void {
    if (!response.success || !response.data?.length) {
      console.warn('No current order found or failed to load');
      return;
    }

    const currentOrder = response.data[0];
    this.orderId = currentOrder.id;

    const mappedItems = this.mapOrderItemsToCartItems(currentOrder.items || []);
    this.cartItems.set(mappedItems);
  }

  private mapOrderItemsToCartItems(orderItems: any[]): CartItem[] {
    return orderItems.map(item => ({
      id: item.id,
      name: item.product.name,
      price: this.parsePrice(item.product.price),
      discountedPrice: item.product.discountedPrice,
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

  private performQuantityUpdate(item: CartItem, newQuantity: number): void {
    if (!this.orderId) {
      this.handleError('No order ID available for update');
      return;
    }

    this.orderService.addItemToOrder(this.orderId, item.productId!, newQuantity)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.handleError('Error updating quantity', error);
          return EMPTY;
        })
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.updateLocalQuantity(item.id, newQuantity);
          } else {
            this.handleError(`Failed to update quantity: ${response.message}`);
          }
        }
      });
  }

  private decrementQuantity(item: CartItem): void {
    if (!item.itemId) {
      this.handleError('Item ID not found for decrement');
      return;
    }

    if (item.quantity <= 1) {
      this.removeItem(item.id);
      return;
    }

    this.orderService.deleteItemFromOrder(item.itemId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.handleError('Error decrementing quantity', error);
          return EMPTY;
        })
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.updateLocalQuantity(item.id, -1);
          } else {
            this.handleError(`Failed to decrement quantity: ${response.message}`);
          }
        }
      });
  }

  private createBulkDeleteOperations(items: CartItem[]) {
    return items
      .filter(item => item.itemId)
      .map(item =>
        this.orderService.deleteItemFromOrder(item.itemId!).pipe(
          catchError(error => {
            console.error('Error deleting item:', item.name, error);
            return of({ success: false, data: null });
          })
        )
      );
  }

  private performBulkDelete(deleteOperations: any[]): void {
    if (deleteOperations.length === 0) {
      this.cartItems.set([]);
      return;
    }

    forkJoin(deleteOperations)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (responses) => {
          const failedCount = responses.filter(r => !r.success).length;
          if (failedCount > 0) {
            console.warn(`${failedCount} items failed to delete from backend`);
          }
          // Clear cart regardless of some failures
          this.cartItems.set([]);
        },
        error: (error) => {
          this.handleError('Error clearing cart', error);
          // Still clear the cart locally
          this.cartItems.set([]);
        }
      });
  }

  // Utility Methods
  private findCartItem(itemId: number): CartItem | undefined {
    return this.cartItems().find(item => item.id === itemId);
  }

  private updateLocalQuantity(itemId: number, newQuantity: number): void {
    this.cartItems.update(items =>
      items.map(item =>
        item.id === itemId ? { ...item, quantity: Math.max(1, item.quantity + newQuantity) } : item
      )
    );
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

  private parsePrice(price: string | number): number {
    return typeof price === 'string' ? parseFloat(price) : price;
  }

  private handleError(message: string, error?: any): void {
    console.error(message, error);
    this.error.set(message);

    // Clear error after 5 seconds
    setTimeout(() => this.error.set(null), 5000);
  }
}
