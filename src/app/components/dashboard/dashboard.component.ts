import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { AdminDashboardSummary, AdminOrder, OrderService } from '../../services/order.service';

interface DashboardMetric {
  label: string;
  value: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  @ViewChild('pendingOrdersDialog') private pendingOrdersDialog?: ElementRef<HTMLDialogElement>;

  summary: AdminDashboardSummary | null = null;
  isLoading = true;
  error: string | null = null;
  pendingOrders: AdminOrder[] = [];
  isLoadingPendingOrders = false;
  pendingOrdersError: string | null = null;
  selectedPendingOrder: AdminOrder | null = null;
  selectedOrderStatus = '';
  isUpdatingOrderStatus = false;
  orderStatusError: string | null = null;
  orderStatusMessage: string | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get metrics(): DashboardMetric[] {
    if (!this.summary) return [];

    return [
      { label: 'Pedidos pendientes de pago', value: this.summary.pendingPaymentCount },
      { label: 'Pedidos en preparación', value: this.summary.preparingCount },
      { label: 'Pedidos finalizados en los últimos 30 días', value: this.summary.completedLast30DaysCount }
    ];
  }

  loadSummary(): void {
    this.isLoading = true;
    this.error = null;

    this.orderService.getAdminDashboardSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          const counts = response.data;
          if (
            !response.success ||
            !counts ||
            !Number.isFinite(counts.pendingPaymentCount) ||
            !Number.isFinite(counts.preparingCount) ||
            !Number.isFinite(counts.completedLast30DaysCount)
          ) {
            this.summary = null;
            this.error = response.message || 'La respuesta de indicadores no es válida.';
          } else {
            this.summary = counts;
          }
          this.isLoading = false;
        },
        error: () => {
          this.summary = null;
          this.error = 'No se pudieron cargar los indicadores de pedidos.';
          this.isLoading = false;
        }
      });
  }

  trackByMetricLabel(index: number, metric: DashboardMetric): string {
    return metric.label;
  }

  openPendingOrders(): void {
    const dialog = this.pendingOrdersDialog?.nativeElement;
    if (dialog && !dialog.open) dialog.showModal();

    this.selectedPendingOrder = null;
    this.pendingOrders = [];
    this.isLoadingPendingOrders = true;
    this.pendingOrdersError = null;
    this.orderService.getAllOrdersForAdmin()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (!response.success || !Array.isArray(response.data)) {
            this.pendingOrders = [];
            this.pendingOrdersError = response.message || 'La respuesta de pedidos no es válida.';
          } else {
            this.pendingOrders = response.data.filter(order => this.isPaymentPending(order.status));
          }
          this.isLoadingPendingOrders = false;
        },
        error: () => {
          this.pendingOrders = [];
          this.pendingOrdersError = 'No se pudieron cargar los pedidos pendientes de pago.';
          this.isLoadingPendingOrders = false;
        }
      });
  }

  closePendingOrders(): void {
    const dialog = this.pendingOrdersDialog?.nativeElement;
    if (dialog?.open) dialog.close();
    this.selectedPendingOrder = null;
    this.selectedOrderStatus = '';
    this.orderStatusError = null;
    this.orderStatusMessage = null;
  }

  onPendingOrdersBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closePendingOrders();
  }

  retryPendingOrders(): void {
    this.openPendingOrders();
  }

  openPendingOrderDetail(order: AdminOrder): void {
    this.selectedPendingOrder = order;
    this.selectedOrderStatus = order.status;
    this.orderStatusError = null;
    this.orderStatusMessage = null;
  }

  backToPendingOrders(): void {
    this.selectedPendingOrder = null;
    this.selectedOrderStatus = '';
    this.orderStatusError = null;
    this.orderStatusMessage = null;
  }

  changeOrderStatus(event: Event): void {
    const order = this.selectedPendingOrder;
    const nextStatus = (event.target as HTMLSelectElement).value;
    if (!order || nextStatus !== 'completed' || this.isUpdatingOrderStatus) {
      this.selectedOrderStatus = order?.status || '';
      return;
    }

    this.selectedOrderStatus = nextStatus;
    this.isUpdatingOrderStatus = true;
    this.orderStatusError = null;
    this.orderStatusMessage = null;

    this.orderService.completeOrder(order.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (!response.success) {
            this.selectedOrderStatus = order.status;
            this.orderStatusError = response.message || 'No se pudo actualizar el estado del pedido.';
          } else {
            order.status = response.data?.status || 'completed';
            this.selectedOrderStatus = order.status;
            this.pendingOrders = this.pendingOrders.filter(pendingOrder => pendingOrder.id !== order.id);
            this.orderStatusMessage = 'El pedido se marcó como completado.';
            this.loadSummary();
          }
          this.isUpdatingOrderStatus = false;
        },
        error: () => {
          this.selectedOrderStatus = order.status;
          this.orderStatusError = 'No se pudo actualizar el estado del pedido. Inténtalo nuevamente.';
          this.isUpdatingOrderStatus = false;
        }
      });
  }

  getOrderStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente de pago',
      pending_payment: 'Pendiente de pago',
      awaiting_payment: 'Pendiente de pago',
      waiting_for_payment: 'Pendiente de pago',
      preparing: 'En preparación',
      completed: 'Completado'
    };
    return labels[status] || status;
  }

  getOrderItemTotal(item: NonNullable<AdminOrder['items']>[number]): number {
    const total = Number(item.total);
    return Number.isFinite(total) ? total : Number(item.price) * item.quantity;
  }

  getBillingAddress(order: AdminOrder): string {
    const address = order.billingAddress;
    return [
      address?.addressLine1,
      address?.addressLine2,
      address?.city,
      address?.state,
      address?.postalCode,
      address?.country
    ].filter(value => Boolean(value?.trim())).join(', ') || 'No registrada';
  }

  isPaymentPending(status: string): boolean {
    const normalizedStatus = String(status).trim().toLowerCase().replace(/[\s-]+/g, '_');
    return ['pending', 'pending_payment', 'awaiting_payment', 'waiting_for_payment'].includes(normalizedStatus);
  }

  get pendingOrdersTotal(): number {
    return this.pendingOrders.reduce((sum, order) => {
      const total = Number(order.total);
      return sum + (Number.isFinite(total) ? total : 0);
    }, 0);
  }

  getCustomerName(order: AdminOrder): string {
    return order.billingAddress?.fullName?.trim() || order.user?.name?.trim() || 'Sin nombre registrado';
  }

  formatOrderDate(dateValue: string): string {
    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleDateString('es', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  trackByPendingOrderId(index: number, order: AdminOrder): number {
    return order.id;
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  login(): void {
    this.authService.loginWithGoogle();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  goToOrders(): void {
    this.router.navigate(['/mis-compras']);
  }

  goToCart(): void {
    this.router.navigate(['/carrito']);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
