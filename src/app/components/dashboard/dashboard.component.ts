import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { AdminDashboardSummary, OrderService } from '../../services/order.service';

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
  summary: AdminDashboardSummary | null = null;
  isLoading = true;
  error: string | null = null;

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
