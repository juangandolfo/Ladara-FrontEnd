import { Component, computed, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
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
}

export type PaymentMethod = 'credit_card' | 'sezzle' | 'crypto';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html'
})
export class CheckoutComponent {
  // Signals
  readonly cartItems = signal<OrderItem[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly formData = signal<BillingFormData>({
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
    newsletter: false}
  )
  
  // Private properties
  

  // Computed properties
  readonly orderSummary = computed((): OrderSummary => {
    const items = this.cartItems();

    const subtotal = 100; //this.calculateSubtotal(items);
    const couponCode = ''; //this.getCouponCode();
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    const discount = subtotal * (this.validateCouponCode(couponCode) ? 0.1 : 0); // Example: 10% discount for a valid coupon code

    return {items, subtotal, couponCode, discount, tax, total };
  });

  constructor(
    private readonly router: Router,    
  ) {}
  
  confirmOrder() {
    alert('Order confirmed');
    this.goHome();
  }

  // Public Methods
  onCouponClick(): void {
  alert('Coupon code input clicked');
  }

  onPlaceOrder(): void {
  alert('Order placed successfully!');
  }

  validateCouponCode(code: string): boolean {
    // Implement your coupon code validation logic here
    let IsValid = code === 'DISCOUNT10'; // Example: Valid coupon code is 'DISCOUNT10'
    // Implement logic to check against DB
    return IsValid; 
  }

  // Navigation Methods
    goHome(): void {
      this.router.navigate(['/']);
    }
}
