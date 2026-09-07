import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: []
})
export class DashboardComponent {
  constructor(
    private readonly router: Router,
    private readonly authService: AuthService
  ) {}

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
