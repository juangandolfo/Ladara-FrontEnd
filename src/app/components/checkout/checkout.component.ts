import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- Added FormsModule
import { Router } from '@angular/router';

// Constants
const TAX_RATE = 0.08;

// Interfaces
export interface BillingFormData {
  firstName: string;
  lastName: string;
  company?: string;
  country: string;
  streetAddress: string;
  streetAddress2?: string;
  townCity: string;
  stateCounty: string;
  postcode: string;
  phone: string;
  email: string;
  newsletter: boolean;
}

export interface CardDetails {
  number: string;
  exp: string;
  csc: string;
}

export interface OrderItem {
  productName: string;
  quantity: number;
  formulation: string;
  cbdType: string;
  strength: string;
  itemTotal: number;
}

export interface OrderSummary {
  items: OrderItem[];
  subtotal: number;
  couponCode?: string;
  discount: number;
  tax: number;
  total: number;
  // Added optional single-item visual fallback fields for template bindings
  productName?: string;
  quantity?: number;
  itemTotal?: number;
  formulation?: string;
  cbdType?: string;
  strength?: string;
}

export type PaymentMethod = 'credit_card' | 'sezzle' | 'crypto';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule], // <-- Added FormsModule here
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class CheckoutComponent {
  // Signals
  readonly cartItems = signal<OrderItem[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  // Standard object mutable for template [(ngModel)] two-way binding
  formData: BillingFormData = {
    firstName: '',
    lastName: '',
    company: '',
    country: '',
    streetAddress: '',
    streetAddress2: '',
    townCity: '',
    stateCounty: '',
    postcode: '',
    phone: '+598 99 123 456',
    email: 'example@mycompany.com',
    newsletter: false
  };

  // Computed properties
  readonly orderSummary = computed((): OrderSummary => {
    const items = this.cartItems();
    const subtotal = 100;
    const couponCode = '';
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    const discount = subtotal * (this.validateCouponCode(couponCode) ? 0.1 : 0);

    return {
      items,
      subtotal,
      couponCode,
      discount,
      tax,
      total,
      productName: items[0]?.productName,
      quantity: items[0]?.quantity,
      itemTotal: items[0]?.itemTotal,
      formulation: items[0]?.formulation,
      cbdType: items[0]?.cbdType,
      strength: items[0]?.strength
    };
  });

  constructor(private readonly router: Router) {}

  confirmOrder(): void {
    alert('Order confirmed');
    this.goHome();
  }

  // Public Methods
  onCouponClick(): void {
    alert('Coupon code input clicked');
  }

  onRemoveCoupon(): void {
    alert('Coupon code removed');
  }

  onPlaceOrder(): void {
    alert('Order placed successfully!');
  }

  validateCouponCode(code: string): boolean {
    return code === 'DISCOUNT10';
  }

  // Navigation Methods
  goHome(): void {
    this.router.navigate(['/']);
  }
}