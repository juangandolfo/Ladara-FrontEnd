import { Component, computed, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil, forkJoin, EMPTY, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { OrderService } from '../../services/order.service';

// Constants
const DEFAULT_PLACEHOLDER_IMAGE = '/vacuna.jpg';

// Enums
export enum OrderStatus {
  CART = 'cart',
  PENDING = 'pending',
  PENDING_PAYMENT = 'pending_payment',
  PREPARING = 'preparing',
  DELIVERY = 'delivery',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Interfaces
export interface OrderProduct {
  id: number;
  name: string;
  price: number;
  discountedPrice?: number;
  image?: string;
  category: string;
}

export interface OrderItem {
  id: number;
  quantity: number;
  product: OrderProduct;
}

export interface Order {
  id: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  total?: number;
}

interface OrderSummary {
  pendingPaymentCount: number;
  preparingCount: number;
  completedCount: number;
  totalSpent: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Component({
  selector: 'app-my-orders',
  templateUrl: './my-orders.component.html',
  styleUrls: ['./my-orders.component.css'],
  imports: [CommonModule],
  standalone: true
})
export class MyOrdersComponent implements OnInit, OnDestroy {
  // Signals
  readonly orders = signal<Order[]>([]);
  readonly expandedOrderIds = signal<Set<number>>(new Set());
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly isRepeatingOrder = signal(false);

  // Private properties
  private currentOrderId: number | null = null;
  private readonly destroy$ = new Subject<void>();

  // Computed properties
  readonly pendingPaymentOrders = computed(() =>
    this.orders().filter(order => this.isPaymentPending(order.status))
  );

  readonly preparingOrders = computed(() =>
    this.getOrdersByStatus([OrderStatus.PREPARING, OrderStatus.DELIVERY])
  );

  readonly completedOrders = computed(() =>
    this.getOrdersByStatus([OrderStatus.COMPLETED, OrderStatus.CANCELLED])
  );

  readonly orderSummary = computed((): OrderSummary => {
    const orders = this.orders();
    return {
      pendingPaymentCount: this.pendingPaymentOrders().length,
      preparingCount: this.preparingOrders().length,
      completedCount: this.completedOrders().length,
      totalSpent: this.calculateTotalSpent(orders)
    };
  });

  readonly hasOrders = computed(() => this.orders().length > 0);
  readonly isEmpty = computed(() => !this.hasOrders() && !this.isLoading() && !this.error());

  constructor(
    private readonly router: Router,
    private readonly orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Public Methods
  loadOrders(): void {
    this.setLoadingState(true);
    this.clearError();

    this.orderService.getAllOrders()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.handleError('Error al cargar las órdenes', error);
          this.setLoadingState(false);
          return EMPTY;
        })
      )
      .subscribe({
        next: (response) => {
          this.processOrdersResponse(response);
          this.setLoadingState(false);
        }
      });
  }

  async repeatOrder(order: Order): Promise<void> {
    if (this.isRepeatingOrder()) return;

    try {
      this.isRepeatingOrder.set(true);
      await this.performOrderRepeat(order);
      this.navigateToCart();
    } catch (error) {
      this.handleError('Error al repetir la orden', error);
    } finally {
      this.isRepeatingOrder.set(false);
    }
  }

  // Utility Methods
  getStatusText(status: OrderStatus | string): string {
    if (this.isPaymentPending(status)) {
      return 'Pendiente de pago';
    }

    const statusTextMap: Record<OrderStatus, string> = {
      [OrderStatus.CART]: 'En Carrito',
      [OrderStatus.PENDING]: 'Pendiente',
      [OrderStatus.PENDING_PAYMENT]: 'Pendiente de pago',
      [OrderStatus.PREPARING]: 'Preparando',
      [OrderStatus.DELIVERY]: 'En Entrega',
      [OrderStatus.COMPLETED]: 'Completado',
      [OrderStatus.CANCELLED]: 'Cancelado'
    };
    return statusTextMap[status as OrderStatus] || String(status);
  }

  getStatusClass(status: OrderStatus | string): string {
    if (this.isPaymentPending(status)) {
      return 'status-pending';
    }

    const statusClassMap: Record<OrderStatus, string> = {
      [OrderStatus.CART]: 'status-cart',
      [OrderStatus.PENDING]: 'status-pending',
      [OrderStatus.PENDING_PAYMENT]: 'status-pending',
      [OrderStatus.PREPARING]: 'status-preparing',
      [OrderStatus.DELIVERY]: 'status-delivery',
      [OrderStatus.COMPLETED]: 'status-completed',
      [OrderStatus.CANCELLED]: 'status-cancelled'
    };
    return statusClassMap[status as OrderStatus] || 'status-default';
  }

  isPaymentPending(status: OrderStatus | string): boolean {
    const normalizedStatus = String(status).trim().toLowerCase().replace(/[\s-]+/g, '_');
    return ['pending', 'pending_payment', 'awaiting_payment', 'waiting_for_payment']
      .includes(normalizedStatus);
  }

  isOrderExpanded(orderId: number): boolean {
    return this.expandedOrderIds().has(orderId);
  }

  toggleOrderDetails(orderId: number): void {
    this.expandedOrderIds.update(expandedIds => {
      const nextExpandedIds = new Set(expandedIds);
      if (nextExpandedIds.has(orderId)) {
        nextExpandedIds.delete(orderId);
      } else {
        nextExpandedIds.add(orderId);
      }
      return nextExpandedIds;
    });
  }

  calculateOrderTotal(order: Order): number {
    return order.items.reduce((total, item) => {
      const price = this.getEffectivePrice(item.product);
      return total + (price * item.quantity);
    }, 0);
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Fecha no válida';
    }
  }

  getProductImage(product: OrderProduct): string {
    const safeImage = product?.image?.trim();

    if (!safeImage) {
      return DEFAULT_PLACEHOLDER_IMAGE;
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

  // Navigation Methods
  goToCart(): void {
    this.navigateToCart();
  }

  continueShopping(): void {
    this.navigateToHome();
  }

  goHome(): void {
    this.navigateToHome();
  }

  // TrackBy Functions for Performance
  trackByOrderId(index: number, order: Order): number {
    return order.id;
  }

  trackByItemId(index: number, item: OrderItem): number {
    return item.id;
  }

  // Private Helper Methods
  private processOrdersResponse(response: ApiResponse<Order[]>): void {
    if (response.success && response.data) {
      const sortedOrders = this.sortOrdersByDate(response.data);
      this.orders.set(sortedOrders);
    } else {
      this.handleError('Error al cargar las órdenes: ' + (response.message || 'Respuesta inválida'));
    }
  }

  private sortOrdersByDate(orders: Order[]): Order[] {
    return [...orders].sort((a, b) => {
      const paymentPriority = Number(this.isPaymentPending(b.status)) - Number(this.isPaymentPending(a.status));
      return paymentPriority || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  private getOrdersByStatus(statuses: OrderStatus[]): Order[] {
    return this.orders()
      .filter(order => statuses.includes(order.status) && !this.isPaymentPending(order.status))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  private calculateTotalSpent(orders: Order[]): number {
    return orders
      .filter(order => order.status === OrderStatus.COMPLETED)
      .reduce((total, order) => total + this.calculateOrderTotal(order), 0);
  }

  private getEffectivePrice(product: OrderProduct): number {
    return product.discountedPrice ?? product.price;
  }

  private async performOrderRepeat(order: Order): Promise<void> {
    const orderId = await this.ensureCurrentOrder();
    if (!orderId) {
      throw new Error('No se pudo obtener el carrito actual');
    }

    const addItemOperations = this.createAddItemOperations(order.items, orderId);
    await this.executeAddItemOperations(addItemOperations);
  }

  private async ensureCurrentOrder(): Promise<number | null> {
    if (this.currentOrderId) {
      return this.currentOrderId;
    }

    return new Promise((resolve) => {
      this.orderService.getCurrentOrder()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: ApiResponse<Order[]>) => {
            const currentOrder = response?.data?.[0];
            this.currentOrderId = currentOrder?.id || null;
            resolve(this.currentOrderId);
          },
          error: (error) => {
            console.error('Error fetching current order:', error);
            resolve(null);
          }
        });
    });
  }

  private createAddItemOperations(items: OrderItem[], orderId: number) {
    return items.map(item =>
      this.orderService.addItemToOrder(orderId, item.product.id, item.quantity)
        .pipe(
          catchError(error => {
            console.error('Error adding item to order:', item.product.name, error);
            return of({ success: false, data: null, message: `Error adding ${item.product.name}` });
          })
        )
    );
  }

  private async executeAddItemOperations(operations: any[]): Promise<void> {
    return new Promise((resolve, reject) => {
      forkJoin(operations)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (responses) => {
            const failedItems = responses.filter(r => !r.success);
            if (failedItems.length > 0) {
              console.warn(`${failedItems.length} items failed to add to cart`);
            }
            resolve();
          },
          error: (error) => {
            reject(error);
          }
        });
    });
  }

  private setLoadingState(loading: boolean): void {
    this.isLoading.set(loading);
  }

  private clearError(): void {
    this.error.set(null);
  }

  private handleError(message: string, error?: any): void {
    console.error(message, error);
    this.error.set(message);
  }

  private navigateToCart(): void {
    this.router.navigate(['/carrito']);
  }

  private navigateToHome(): void {
    this.router.navigate(['/']);
  }
}
