import { Component, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { OrderService } from '../../services/order.service';
import { FormsModule } from '@angular/forms'; 
import { AuthService } from '../../services/auth.service';
import { ProductService } from '../../services/product.service';
import { DialogService } from '../../services/dialog.service';

const TAX_RATE = 0.08;
const DEFAULT_PRODUCT_IMAGE = '/vacuna.jpg';
const ALL_CATEGORIES = 'Todas';

export interface BillingFormData {
  firstName: string;
  lastName: string;
  company?: string;
  country: string;
  streetAddress: string;
  streetAddress2?: string;
  townCity: string;
  stateCounty: string;
  state: string;
  postcode: string;
  phone: string;
  email: string;
  newsletter: boolean;
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  discountedPrice?: number;
  quantity: number;
  category: string;
  image?: string;
  description?: string;
  itemId?: number;
  productId?: number;
}

export interface SummaryItem {
  name: string;
  quantity: number;
  price: number;
  itemTotal: number;
  description?: string;
}

export interface OrderSummary {
  items: SummaryItem[];
  subtotal: number;
  couponCode: string;
  discount: number;
  tax: number;
  total: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class CheckoutComponent implements OnInit, OnDestroy {
  /* Signals */
  readonly cartItems = signal<CartItem[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly activeCoupon = signal<string>('DISCOUNT10'); // Managed via signal for dynamic reactivity
  readonly isLoggedIn = signal<boolean>(true); 
  readonly categories = signal<string[]>([]);

  formData: BillingFormData = {
    firstName: '',
    lastName: '',
    company: '',
    country: 'UY',
    streetAddress: '',
    streetAddress2: '',
    townCity: '',
    stateCounty: '',
    state: 'Montevideo',
    postcode: '',
    phone: '',
    email: '',
    newsletter: false
  };

  private orderId: number | null = null;
  private readonly destroy$ = new Subject<void>();


  // Computes layout summary dynamically from cartItems signal
  readonly orderSummary = computed((): OrderSummary => {
    const rawItems = this.cartItems();
    
    const items: SummaryItem[] = rawItems.map(item => {
      const activePrice = item.discountedPrice && item.discountedPrice > 0 ? item.discountedPrice : item.price;
      return {
        name: item.name,
        quantity: item.quantity,
        price: activePrice,
        itemTotal: activePrice * item.quantity,
        description: item.description
      };
    });

    const subtotal = items.reduce((acc, curr) => acc + curr.itemTotal, 0);
    const couponCode = this.activeCoupon();
    const discount = this.validateCouponCode(couponCode) ? subtotal * 0.1 : 0;
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = taxableAmount * TAX_RATE;
    const total = taxableAmount + tax;

    return {
      items,
      subtotal,
      couponCode,
      discount,
      tax,
      total
    };
  });

  constructor(
    private readonly router: Router,
    private readonly orderService: OrderService,
    private readonly authService: AuthService,
    private readonly productService: ProductService,
    private readonly dialogService: DialogService,

  ) {}

  async ngOnInit(): Promise<void> {
    // Initialize login state and listen for changes
    this.updateLoginState();
    this.setupAuthStateListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onCouponClick(): void {
    this.dialogService.prompt(
      'Ingresa tu código de cupón:',
      'Cupón de descuento'
    ).then(code => {
      if (code) {
        this.activeCoupon.set(code.trim());
      }
    });
  }

  onRemoveCoupon(): void {
    this.activeCoupon.set('');
  }

  onPlaceOrder(): void {
    if (!this.orderSummary().items.length) {
      this.dialogService.alert('Tu carrito está vacío.', 'Carrito vacío', 'warning');
      return;
    }
    this.dialogService.alert(
      `Pedido realizado con éxito por un total de $${this.orderSummary().total.toFixed(2)}`,
      'Pedido realizado',
      'success'
    );
  }

  validateCouponCode(code: string): boolean {
    return code === 'DISCOUNT10';
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  goToCart(): void {
    this.router.navigate(['/carrito']);
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

  private normalizeProductImage(image?: string | null): string {
    const safeImage = image?.trim();
    if (!safeImage) return DEFAULT_PRODUCT_IMAGE;
    if (safeImage.startsWith('http://') || safeImage.startsWith('https://') || safeImage.startsWith('/') || safeImage.startsWith('data:')) {
      return safeImage;
    }
    return `/${safeImage.replace(/^\.?\//, '')}`;
  }

  private parsePrice(price: string | number): number {
    const parsed = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(parsed) ? 0 : parsed;
  }

  private handleError(message: string, error?: any): void {
    console.error(message, error);
    this.error.set(message);
    setTimeout(() => this.error.set(null), 5000);
  }
}