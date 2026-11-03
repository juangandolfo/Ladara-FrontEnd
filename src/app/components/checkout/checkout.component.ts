import { Component, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { CheckoutRequest, OrderService } from '../../services/order.service';
import { FormsModule } from '@angular/forms'; 
import { AuthService } from '../../services/auth.service';
import { ProductService } from '../../services/product.service';
import { DialogService } from '../../services/dialog.service';

const TAX_RATE = 0.08;
const DEFAULT_PRODUCT_IMAGE = '/vacuna.jpg';
const ALL_CATEGORIES = 'Todas';
const PENDING_PAYMENT_METHOD = 'pending';

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
  id?: number;
  itemId?: number;
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
  readonly rejectedItemIds = signal<number[]>([]);
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
        id: item.id,
        itemId: item.itemId,
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
    this.updateLoginState();
    this.setupAuthStateListener();
    this.loadCurrentOrder();
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
    if (this.isLoading()) return;

    if (!this.orderSummary().items.length) {
      this.dialogService.alert('Tu carrito está vacío.', 'Carrito vacío', 'warning');
      return;
    }

    if (![this.formData.firstName, this.formData.lastName, this.formData.streetAddress,
      this.formData.townCity, this.formData.postcode, this.formData.country].every(value => value.trim())) {
      this.error.set('Completa los datos de facturación obligatorios antes de continuar.');
      return;
    }

    const validator = (this.orderService as OrderService & {
      validateCurrentOrder?: (orderId: number) => any
    }).validateCurrentOrder;
    if (!this.orderId || !validator) {
      this.error.set('No se pudo validar el pedido. Intenta nuevamente.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    validator.call(this.orderService, this.orderId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        this.isLoading.set(false);
        const rejectedItems = response?.data?.rejectedItems || [];
        if (!response?.success || response?.data?.valid !== true || rejectedItems.length) {
          this.rejectedItemIds.set(rejectedItems.map((item: any) => Number(item.itemId)).filter(Number.isFinite));
          this.error.set(rejectedItems.map((item: any) => item.message).filter(Boolean).join('. ') || response?.message || 'Hay productos que requieren atención antes de continuar.');
          return;
        }
        this.rejectedItemIds.set([]);
        const checkout: CheckoutRequest = {
          billingAddress: {
            fullName: `${this.formData.firstName.trim()} ${this.formData.lastName.trim()}`,
            addressLine1: this.formData.streetAddress.trim(),
            ...(this.formData.streetAddress2?.trim() ? { addressLine2: this.formData.streetAddress2.trim() } : {}),
            city: this.formData.townCity.trim(),
            ...(this.formData.state?.trim() ? { state: this.formData.state.trim() } : {}),
            postalCode: this.formData.postcode.trim(),
            country: this.formData.country.trim(),
            ...(this.formData.phone?.trim() ? { phone: this.formData.phone.trim() } : {})
          },
          paymentMethod: PENDING_PAYMENT_METHOD
        };

        this.orderService.initiateCheckout(this.orderId!, checkout)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (checkoutResponse) => {
              this.isLoading.set(false);
              if (!checkoutResponse?.success) {
                this.error.set(checkoutResponse?.message || 'No se pudo iniciar el pedido. Intenta nuevamente.');
                return;
              }
              this.dialogService.alert(
                'Pedido enviado. El pago aún está pendiente.',
                'Pedido iniciado',
                'success'
              );
            },
            error: (checkoutError) => {
              this.isLoading.set(false);
              this.error.set(checkoutError?.error?.message || 'No se pudo iniciar el pedido con el servidor. Intenta nuevamente.');
            }
          });
      },
      error: () => {
        this.isLoading.set(false);
        this.error.set('No se pudo validar el pedido con el servidor. Intenta nuevamente.');
      }
    });
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

  private loadCurrentOrder(): void {
    const getCurrentOrder = (this.orderService as OrderService & { getCurrentOrder?: () => any }).getCurrentOrder;
    if (!getCurrentOrder) return;
    this.isLoading.set(true);
    getCurrentOrder.call(this.orderService).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        const order = Array.isArray(response?.data) ? response.data[0] : response?.data;
        this.orderId = Number(order?.id) || null;
        const items = (order?.items || []).map((item: any) => ({
          id: item.id,
          itemId: item.id,
          productId: item.product?.id,
          name: item.product?.name || 'Producto',
          price: Number(item.product?.price ?? item.price) || 0,
          discountedPrice: Number(item.product?.discountedPrice) || undefined,
          quantity: Number(item.quantity) || 0,
          category: item.product?.category || '',
          stock: Number.isFinite(Number(item.product?.stock)) ? Number(item.product.stock) : undefined
        }));
        this.cartItems.set(items);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.error.set('No se pudo cargar el carrito para el pago.');
      }
    });
  }
}