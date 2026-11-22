import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { AdminDashboardSummary, AdminOrder, OrderService } from '../../services/order.service';
import { AdminDashboardData, AnalyticsService, BusinessSettingResponse } from '../../services/analytics.service';
import { OrderFulfillmentUpdateDto, OrderPaymentStatus } from '../../services/models/order.model';

interface RevenueDay {
  date: string;
  label: string;
  value: number;
  height: number;
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
  private analyticsData: AdminDashboardData | null = null;
  analyticsFrom = this.getDateKey(new Date(Date.now() - 6 * 86_400_000));
  analyticsTo = this.getDateKey(new Date());
  isLoadingAnalytics = false;
  analyticsError: string | null = null;
  monthlyTargetInput = '';
  timezoneInput = 'America/Montevideo';
  isLoadingSettings = false;
  isSettingsLoaded = false;
  isSavingSettings = false;
  savingSetting: 'target' | 'timezone' | null = null;
  settingsError: string | null = null;
  settingsMessage: string | null = null;
  isLoading = true;
  error: string | null = null;
  dashboardOrders: AdminOrder[] = [];
  recentDashboardOrders: AdminOrder[] = [];
  hasRequestedDashboardOrders = false;
  hasLoadedDashboardOrders = false;
  revenueDays: RevenueDay[] = [];
  private revenueChartDescription = 'Ingresos confirmados del periodo seleccionado.';
  isLoadingDashboardOrders = true;
  dashboardOrdersError: string | null = null;
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

  get analytics(): AdminDashboardData | null {
    return this.analyticsData;
  }

  set analytics(value: AdminDashboardData | null) {
    this.analyticsData = value;
    this.revenueDays = value ? this.buildRevenueDays(value.revenueByDay) : [];
    this.revenueChartDescription = value
      ? this.buildRevenueChartDescription(value)
      : 'Ingresos confirmados del periodo seleccionado.';
  }

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly orderService: OrderService,
    readonly analyticsService?: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.loadSummary();
    this.loadDashboardOrders();
    if (this.analyticsService) {
      this.loadAnalytics();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  loadAnalytics(): void {
    if (!this.analyticsService) return;
    this.isLoadingAnalytics = true;
    this.analyticsError = null;
    this.analyticsService.getAdminDashboard(this.analyticsFrom, this.analyticsTo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (!response.success || !response.data) {
            this.analyticsError = response.message || 'La respuesta de analítica no es válida.';
          } else {
            this.analytics = response.data;
          }
          this.isLoadingAnalytics = false;
        },
        error: error => {
          this.analyticsError = this.getAnalyticsErrorMessage(error);
          this.isLoadingAnalytics = false;
          if (error?.status === 401) this.authService.loginWithGoogle();
        }
      });
  }

  setAnalyticsDate(field: 'from' | 'to', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (field === 'from') this.analyticsFrom = value;
    else this.analyticsTo = value;
  }

  loadBusinessSettings(): void {
    if (!this.analyticsService) return;
    this.isLoadingSettings = true;
    this.settingsError = null;
    let responsesReceived = 0;
    const finish = (): void => {
      responsesReceived += 1;
      if (responsesReceived === 2) {
        this.isLoadingSettings = false;
        this.isSettingsLoaded = true;
      }
    };

    this.analyticsService.getMonthlySalesTarget().pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        if (response.success && response.data) {
          this.monthlyTargetInput = response.data.value === null ? '' : String(response.data.value);
        } else {
          this.settingsError = response.message || 'No se pudo consultar la meta mensual.';
        }
        finish();
      },
      error: error => {
        this.settingsError = this.getSettingsErrorMessage(error);
        finish();
      }
    });
    this.analyticsService.getTimezone().pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        if (response.success && response.data) this.timezoneInput = response.data.value;
        else this.settingsError = response.message || 'No se pudo consultar la zona horaria.';
        finish();
      },
      error: error => {
        this.settingsError = this.getSettingsErrorMessage(error);
        finish();
      }
    });
  }

  onSettingsToggle(event: Event): void {
    const details = event.currentTarget as HTMLDetailsElement;
    if (details.open && !this.isSettingsLoaded && !this.isLoadingSettings) this.loadBusinessSettings();
  }

  saveMonthlyTarget(): void {
    const amount = Number(this.monthlyTargetInput);
    if (!this.analyticsService || !this.monthlyTargetInput.trim() || !Number.isFinite(amount) || amount < 0) {
      this.settingsError = 'Ingresa una meta válida igual o mayor que cero.';
      this.settingsMessage = null;
      return;
    }
    this.saveSetting(this.analyticsService.updateMonthlySalesTarget(amount), 'Se guardó la meta mensual.', 'target');
  }

  saveTimezone(): void {
    if (!this.analyticsService) return;
    this.saveSetting(this.analyticsService.updateTimezone(this.timezoneInput), 'Se guardó la zona horaria.', 'timezone');
  }

  private saveSetting<T>(
    request: Observable<BusinessSettingResponse<T>>,
    successMessage: string,
    setting: 'target' | 'timezone'
  ): void {
    this.isSavingSettings = true;
    this.savingSetting = setting;
    this.settingsError = null;
    this.settingsMessage = null;
    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        if (response.success) {
          this.settingsMessage = successMessage;
          if (response.data) {
            if (setting === 'target') this.monthlyTargetInput = String(response.data.value ?? '');
            else this.timezoneInput = String(response.data.value ?? '');
          }
          this.loadAnalytics();
        } else {
          this.settingsError = response.message || 'No se pudo guardar la configuración.';
        }
        this.isSavingSettings = false;
        this.savingSetting = null;
      },
      error: error => {
        this.settingsError = this.getSettingsErrorMessage(error);
        this.isSavingSettings = false;
        this.savingSetting = null;
      }
    });
  }

  private getAnalyticsErrorMessage(error: any): string {
    switch (error?.status) {
      case 400: return 'Revisa las fechas: el periodo debe ser válido y no superar los 366 días.';
      case 403: return 'Tu cuenta no tiene permisos de administrador para consultar estas métricas.';
      case 500: return 'Ocurrió un error inesperado al cargar las métricas. Inténtalo nuevamente.';
      default: return error?.message || 'No se pudieron cargar las métricas. Inténtalo nuevamente.';
    }
  }

  private getSettingsErrorMessage(error: any): string {
    if (error?.status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
    if (error?.status === 403) return 'Tu cuenta no tiene permisos de administrador para cambiar la configuración.';
    if (error?.status === 400) return 'Revisa el valor ingresado e inténtalo nuevamente.';
    return 'No se pudo guardar o consultar la configuración. Inténtalo nuevamente.';
  }

  loadDashboardOrders(): void {
    this.hasRequestedDashboardOrders = true;
    this.isLoadingDashboardOrders = true;
    this.dashboardOrdersError = null;
    this.orderService.getAllOrdersForAdmin()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (!response.success || !Array.isArray(response.data)) {
            this.dashboardOrders = [];
            this.recentDashboardOrders = [];
            this.dashboardOrdersError = response.message || 'La respuesta de pedidos no es válida.';
          } else {
            this.dashboardOrders = response.data;
            this.recentDashboardOrders = this.buildRecentDashboardOrders(response.data);
            this.syncOrderDialogLists();
          }
          this.hasLoadedDashboardOrders = true;
          this.isLoadingDashboardOrders = false;
          if (this.isLoadingPendingOrders) {
            this.isLoadingPendingOrders = false;
            this.pendingOrdersError = this.dashboardOrdersError;
          }
        },
        error: error => {
          this.dashboardOrdersError = this.getPendingOrdersErrorMessage(error);
          this.isLoadingDashboardOrders = false;
          this.hasLoadedDashboardOrders = true;
          if (this.isLoadingPendingOrders) {
            this.isLoadingPendingOrders = false;
            this.pendingOrdersError = this.dashboardOrdersError;
          }
        }
      });
  }

  get confirmedRevenue(): number {
    return this.analytics?.sales.confirmedRevenue ?? 0;
  }

  get confirmedOrderCount(): number {
    return this.analytics?.sales.paidOrderCount ?? 0;
  }

  private buildRecentDashboardOrders(orders: AdminOrder[]): AdminOrder[] {
    return orders
      .filter(order => !['cart', 'cancelled'].includes(order.status.toLowerCase()))
      .slice()
      .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
      .slice(0, 5);
  }

  private buildRevenueDays(dailyValues: AdminDashboardData['revenueByDay']): RevenueDay[] {
    const maximum = Math.max(0, ...dailyValues.map(day => day.revenue));
    return dailyValues.map(day => {
      const date = new Date(`${day.date}T12:00:00.000Z`);
      return {
        date: day.date,
        label: date.toLocaleDateString('es-UY', { weekday: 'short', timeZone: 'UTC' }),
        value: day.revenue,
        height: maximum ? (day.revenue / maximum) * 100 : 0
      };
    });
  }

  get paidRevenueLastSevenDays(): number {
    return this.analytics?.sales.confirmedRevenue ?? 0;
  }

  private buildRevenueChartDescription(analytics: AdminDashboardData): string {
    const dailyValues = analytics.revenueByDay.map(day => `${day.date}: ${day.revenue}`).join(', ');
    return `Ingresos confirmados del ${analytics.period.from} al ${analytics.period.to}. Total: ${analytics.sales.confirmedRevenue}. ${dailyValues}`;
  }

  getRevenueChartDescription(): string {
    return this.revenueChartDescription;
  }

  getOrderAmount(order: AdminOrder): number {
    const amount = Number(order.total);
    return Number.isFinite(amount) ? amount : 0;
  }

  getOrderStatusLabel(status: string): string {
    return this.getWorkflowStatusLabel(status);
  }

  getOrderStatusClass(status: string): string {
    if (this.isOrderCompleted(status)) return 'status-completed';
    if (this.isOrderPlaced(status)) return 'status-pending';
    return 'status-progress';
  }

  private getDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
    this.pendingOrdersError = this.dashboardOrdersError;
    this.isLoadingPendingOrders = !this.hasLoadedDashboardOrders;
    this.syncOrderDialogLists();

    // The dashboard already loads this collection. Only request it here if the
    // initial request has already finished without producing a usable result.
    if (!this.hasLoadedDashboardOrders && !this.hasRequestedDashboardOrders) {
      this.isLoadingPendingOrders = true;
      this.loadDashboardOrders();
    }
  }

  private syncOrderDialogLists(): void {
    this.pendingOrders = this.dashboardOrders.filter(order => this.isOrderPlaced(order.status));
    this.completedOrders = this.dashboardOrders.filter(order => this.isOrderCompleted(order.status));
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
    this.pendingOrdersError = null;
    this.isLoadingPendingOrders = true;
    this.loadDashboardOrders();
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
            const orderExists = this.dashboardOrders.some(dashboardOrder => dashboardOrder.id === order.id);
            this.dashboardOrders = orderExists
              ? this.dashboardOrders.map(dashboardOrder => dashboardOrder.id === order.id ? order : dashboardOrder)
              : [...this.dashboardOrders, order];
            this.recentDashboardOrders = this.buildRecentDashboardOrders(this.dashboardOrders);
            this.syncOrderDialogLists();
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

  trackByCategoryId(index: number, category: AdminDashboardData['categorySales'][number]): number {
    return category.categoryId;
  }

  trackByRevenueDate(index: number, day: RevenueDay): string {
    return day.date;
  }

  trackByCountry(index: number, country: AdminDashboardData['activeUsersByCountry'][number]): string {
    return country.country || `unknown-${index}`;
  }

  trackByActivityId(index: number, activity: AdminDashboardData['recentActivity'][number]): string {
    return activity.id;
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
