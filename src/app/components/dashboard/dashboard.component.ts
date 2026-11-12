import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { AdminDashboardSummary, AdminOrder, OrderService } from '../../services/order.service';
import { OrderFulfillmentUpdateDto, OrderPaymentStatus } from '../../services/models/order.model';

interface DashboardMetric {
  label: string;
  value: number;
}

interface AdminFulfillmentForm {
  paymentStatus: OrderPaymentStatus;
  paymentReference: string;
  invoiceIssued: boolean;
  invoiceIdentifier: string;
  isDelivered: boolean;
  deliveryDocumentIdentifier: string;
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
  completedOrders: AdminOrder[] = [];
  isLoadingPendingOrders = false;
  pendingOrdersError: string | null = null;
  isViewingCompletedOrders = false;
  selectedPendingOrder: AdminOrder | null = null;
  fulfillmentForm: AdminFulfillmentForm | null = null;
  isUpdatingFulfillment = false;
  fulfillmentError: string | null = null;
  fulfillmentMessage: string | null = null;
  private initialFulfillmentForm: AdminFulfillmentForm | null = null;

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
      { label: 'Carritos activos', value: this.summary.cartCount },
      { label: 'Pedidos realizados', value: this.summary.orderPlacedCount },
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
            !Number.isFinite(counts.cartCount) ||
            !Number.isFinite(counts.orderPlacedCount) ||
            !Number.isFinite(counts.completedLast30DaysCount)
          ) {
            this.summary = null;
            this.error = response.message || 'La respuesta del resumen no contiene los indicadores esperados.';
          } else {
            this.summary = counts;
          }
          this.isLoading = false;
        },
        error: error => {
          this.summary = null;
          this.error = error?.error?.message || 'No se pudieron cargar los indicadores de pedidos.';
          this.isLoading = false;
        }
      });
  }

  trackByMetricLabel(index: number, metric: DashboardMetric): string {
    return metric.label;
  }

  openPendingOrders(): void {
    this.openOrders(false);
  }

  openCompletedOrders(): void {
    this.openOrders(true);
  }

  private openOrders(showCompletedOrders: boolean): void {
    this.isViewingCompletedOrders = showCompletedOrders;
    const dialog = this.pendingOrdersDialog?.nativeElement;
    if (dialog && !dialog.open) dialog.showModal();

    this.selectedPendingOrder = null;
    this.fulfillmentForm = null;
    this.initialFulfillmentForm = null;
    this.pendingOrders = [];
    this.isLoadingPendingOrders = true;
    this.pendingOrdersError = null;
    this.orderService.getAllOrdersForAdmin()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (!response.success || !Array.isArray(response.data)) {
            this.pendingOrders = [];
            this.completedOrders = [];
            this.pendingOrdersError = response.message || 'La respuesta de pedidos no es válida.';
          } else {
            this.pendingOrders = response.data.filter(order =>
              this.isOrderPlaced(order.status)
            );
            this.completedOrders = response.data.filter(order =>
              this.isOrderCompleted(order.status)
            );
          }
          this.isLoadingPendingOrders = false;
        },
        error: error => {
          this.pendingOrders = [];
          this.pendingOrdersError = this.getPendingOrdersErrorMessage(error);
          this.isLoadingPendingOrders = false;
        }
      });
  }

  private getPendingOrdersErrorMessage(error: any): string {
    const orderType = this.isViewingCompletedOrders ? 'completados' : 'realizados';
    const backendMessage = typeof error?.error?.message === 'string'
      ? error.error.message.trim()
      : '';
    if (backendMessage) return `No se pudieron cargar los pedidos: ${backendMessage}`;

    switch (error?.status) {
      case 0:
        return 'No se pudo conectar con el servidor. Verifica que el backend esté iniciado y vuelve a intentarlo.';
      case 401:
        return 'Tu sesión expiró. Cierra sesión e inicia sesión nuevamente.';
      case 403:
        return 'Tu cuenta no tiene permisos de administrador para consultar los pedidos.';
      default:
        return error?.status
          ? `No se pudieron cargar los pedidos ${orderType} (error HTTP ${error.status}).`
          : `No se pudieron cargar los pedidos ${orderType}. Inténtalo nuevamente.`;
    }
  }

  closePendingOrders(): void {
    const dialog = this.pendingOrdersDialog?.nativeElement;
    if (dialog?.open) dialog.close();
    this.selectedPendingOrder = null;
    this.fulfillmentForm = null;
    this.initialFulfillmentForm = null;
    this.fulfillmentError = null;
    this.fulfillmentMessage = null;
    this.isViewingCompletedOrders = false;
  }

  onPendingOrdersBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closePendingOrders();
  }

  retryPendingOrders(): void {
    this.openOrders(this.isViewingCompletedOrders);
  }

  openPendingOrderDetail(order: AdminOrder): void {
    this.selectedPendingOrder = order;
    this.fulfillmentForm = this.createFulfillmentForm(order);
    this.initialFulfillmentForm = { ...this.fulfillmentForm };
    this.fulfillmentError = null;
    this.fulfillmentMessage = null;
  }

  backToPendingOrders(): void {
    this.selectedPendingOrder = null;
    this.fulfillmentForm = null;
    this.initialFulfillmentForm = null;
    this.fulfillmentError = null;
    this.fulfillmentMessage = null;
  }

  setPaymentStatus(event: Event): void {
    if (this.fulfillmentForm) {
      this.fulfillmentForm.paymentStatus = (event.target as HTMLSelectElement).value as OrderPaymentStatus;
    }
  }

  setPaymentReference(event: Event): void {
    if (this.fulfillmentForm) this.fulfillmentForm.paymentReference = (event.target as HTMLInputElement).value;
  }

  setInvoiceIssued(event: Event): void {
    if (!this.fulfillmentForm) return;
    this.fulfillmentForm.invoiceIssued = (event.target as HTMLInputElement).checked;
    if (!this.fulfillmentForm.invoiceIssued) this.fulfillmentForm.invoiceIdentifier = '';
  }

  setInvoiceIdentifier(event: Event): void {
    if (!this.fulfillmentForm) return;
    this.fulfillmentForm.invoiceIdentifier = (event.target as HTMLInputElement).value;
    if (this.fulfillmentForm.invoiceIdentifier.trim()) this.fulfillmentForm.invoiceIssued = true;
  }

  setDelivered(event: Event): void {
    if (this.fulfillmentForm) this.fulfillmentForm.isDelivered = (event.target as HTMLInputElement).checked;
  }

  setDeliveryDocumentIdentifier(event: Event): void {
    if (this.fulfillmentForm) {
      this.fulfillmentForm.deliveryDocumentIdentifier = (event.target as HTMLInputElement).value;
    }
  }

  get hasFulfillmentChanges(): boolean {
    const form = this.fulfillmentForm;
    const initial = this.initialFulfillmentForm;
    if (!form || !initial) return false;
    return form.paymentStatus !== initial.paymentStatus ||
      form.paymentReference.trim() !== initial.paymentReference.trim() ||
      form.invoiceIssued !== initial.invoiceIssued ||
      form.invoiceIdentifier.trim() !== initial.invoiceIdentifier.trim() ||
      form.isDelivered !== initial.isDelivered ||
      form.deliveryDocumentIdentifier.trim() !== initial.deliveryDocumentIdentifier.trim();
  }

  saveOrderFulfillment(): void {
    const order = this.selectedPendingOrder;
    const form = this.fulfillmentForm;
    const initial = this.initialFulfillmentForm;
    if (!order || !form || !initial || !this.hasFulfillmentChanges || this.isUpdatingFulfillment) return;

    const update: OrderFulfillmentUpdateDto = {};
    if (form.paymentStatus !== initial.paymentStatus) update.paymentStatus = form.paymentStatus;
    if (form.paymentReference.trim() !== initial.paymentReference.trim()) {
      update.paymentReference = form.paymentReference.trim() || null;
    }
    if (form.invoiceIssued !== initial.invoiceIssued) update.invoiceIssued = form.invoiceIssued;
    if (form.invoiceIdentifier.trim() !== initial.invoiceIdentifier.trim()) {
      update.invoiceIdentifier = form.invoiceIdentifier.trim() || null;
    }
    if (form.isDelivered !== initial.isDelivered) update.isDelivered = form.isDelivered;
    if (form.deliveryDocumentIdentifier.trim() !== initial.deliveryDocumentIdentifier.trim()) {
      update.deliveryDocumentIdentifier = form.deliveryDocumentIdentifier.trim() || null;
    }

    if (!Object.keys(update).length) return;
    this.isUpdatingFulfillment = true;
    this.fulfillmentError = null;
    this.fulfillmentMessage = null;

    this.orderService.updateOrderFulfillment(order.id, update)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (!response.success || !response.data) {
            this.fulfillmentError = response.message || 'El servidor no devolvió el pedido actualizado.';
          } else {
            Object.assign(order, response.data);
            this.fulfillmentForm = this.createFulfillmentForm(order);
            this.initialFulfillmentForm = { ...this.fulfillmentForm };
            if (!this.isOrderPlaced(order.status)) {
              this.pendingOrders = this.pendingOrders.filter(pendingOrder => pendingOrder.id !== order.id);
            }
            if (!this.isOrderCompleted(order.status)) {
              this.completedOrders = this.completedOrders.filter(completedOrder => completedOrder.id !== order.id);
            }
            this.fulfillmentMessage = 'Se actualizaron los datos de pago, facturación o entrega.';
            this.loadSummary();
          }
          this.isUpdatingFulfillment = false;
        },
        error: error => {
          this.fulfillmentError = error?.status === 409
            ? error?.error?.message || 'El pedido cambió en el servidor. Actualiza los datos e inténtalo nuevamente.'
            : error?.error?.message || 'No se pudo actualizar el pedido. Inténtalo nuevamente.';
          this.isUpdatingFulfillment = false;
        }
      });
  }

  getPaymentMethodLabel(method?: string | null): string {
    return method === 'bank_transfer' ? 'Transferencia bancaria' : method === 'cash' ? 'Efectivo' : 'No registrado';
  }

  getWorkflowStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      cart: 'En carrito',
      order_placed: 'Pedido realizado',
      pending_payment: 'Pendiente de pago',
      preparing: 'En preparación',
      delivery: 'En entrega',
      completed: 'Completado'
    };
    return labels[status] || status;
  }

  private createFulfillmentForm(order: AdminOrder): AdminFulfillmentForm {
    return {
      paymentStatus: order.paymentStatus || 'unpaid',
      paymentReference: order.paymentReference || '',
      invoiceIssued: Boolean(order.invoiceIssuedAt || order.invoiceIdentifier),
      invoiceIdentifier: order.invoiceIdentifier || '',
      isDelivered: Boolean(order.isDelivered),
      deliveryDocumentIdentifier: order.deliveryDocumentIdentifier || ''
    };
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

  isOrderPlaced(status: string): boolean {
    return String(status).trim().toLowerCase().replace(/[\s-]+/g, '_') === 'order_placed';
  }

  isOrderCompleted(status: string): boolean {
    return String(status).trim().toLowerCase().replace(/[\s-]+/g, '_') === 'completed';
  }

  get displayedOrders(): AdminOrder[] {
    return this.isViewingCompletedOrders ? this.completedOrders : this.pendingOrders;
  }

  get pendingOrdersTotal(): number {
    return this.pendingOrders.reduce((sum, order) => {
      const total = Number(order.total);
      return sum + (Number.isFinite(total) ? total : 0);
    }, 0);
  }

  get displayedOrdersTotal(): number {
    return this.displayedOrders.reduce((sum, order) => {
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
