import { Component, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CheckoutRequest, OrderService } from '../../services/order.service';
import { OrderPaymentMethod } from '../../services/models/order.model';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../services/dialog.service';
import { BillingInformationService } from '../../services/billing-information.service';
import { BillingInformation, BillingInformationInput } from '../../services/models/billing-information.model';
import { CartItem } from '../../models/cart-item.model';
import { APP_CONFIG, isValidCouponCode } from '../../config/app.config';

const TAX_RATE = APP_CONFIG.TAX_RATE;

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
  readonly activeCoupon = signal<string>(APP_CONFIG.VALID_COUPON_CODE); // Managed via signal for dynamic reactivity
  readonly billingAddresses = signal<BillingInformation[]>([]);
  readonly selectedBillingInformationId = signal<number | null>(null);
  readonly isLoadingAddresses = signal(false);
  readonly isSavingAddress = signal(false);
  readonly addressError = signal<string | null>(null);
  readonly isAddressFormVisible = signal(false);
  readonly editingAddressId = signal<number | null>(null);

  addressForm: BillingInformationInput = this.createEmptyAddress();

  paymentMethod: OrderPaymentMethod = 'bank_transfer';

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
    const discount = this.validateCouponCode(couponCode) ? subtotal * APP_CONFIG.COUPON_DISCOUNT_RATE : 0;
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
    private readonly dialogService: DialogService,
    private readonly billingInformationService: BillingInformationService
  ) {}

  ngOnInit(): void {
    this.loadCurrentOrder();
    this.loadBillingAddresses();
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

  openNewAddressForm(): void {
    this.addressForm = this.createEmptyAddress();
    this.editingAddressId.set(null);
    this.isAddressFormVisible.set(true);
    this.addressError.set(null);
  }

  editAddress(address: BillingInformation): void {
    this.addressForm = {
      fullName: address.fullName,
      company: address.company ?? '',
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 ?? '',
      city: address.city,
      state: address.state ?? '',
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone ?? ''
    };
    this.editingAddressId.set(address.id);
    this.isAddressFormVisible.set(true);
    this.addressError.set(null);
  }

  cancelAddressForm(): void {
    this.isAddressFormVisible.set(false);
    this.editingAddressId.set(null);
    this.addressForm = this.createEmptyAddress();
    this.addressError.set(null);
  }

  reloadBillingAddresses(): void {
    this.loadBillingAddresses();
  }

  saveAddress(): void {
    if (this.isSavingAddress()) return;
    const input = this.normalizedAddressInput();
    if (!input.fullName || !input.addressLine1 || !input.city || !input.postalCode || !input.country) {
      this.addressError.set('Completa los campos obligatorios de la dirección.');
      return;
    }

    this.isSavingAddress.set(true);
    this.addressError.set(null);
    const addressId = this.editingAddressId();
    const saveRequest = addressId
      ? this.billingInformationService.update(addressId, input)
      : this.billingInformationService.create(input);

    saveRequest.pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        this.isSavingAddress.set(false);
        if (!response?.success || !response.data) {
          this.addressError.set(response?.message || 'No se pudo guardar la dirección. Intenta nuevamente.');
          return;
        }
        const savedAddress = response.data;
        this.billingAddresses.update(addresses => addressId
          ? addresses.map(address => address.id === addressId ? savedAddress : address)
          : [...addresses, savedAddress]);
        this.selectedBillingInformationId.set(savedAddress.id);
        this.cancelAddressForm();
      },
      error: error => {
        this.isSavingAddress.set(false);
        this.addressError.set(error?.error?.message || 'No se pudo guardar la dirección. Intenta nuevamente.');
      }
    });
  }

  async deleteAddress(address: BillingInformation): Promise<void> {
    const confirmed = await this.dialogService.confirm(
      `¿Quieres eliminar la dirección de ${address.fullName}? Los pedidos anteriores usan la dirección guardada; no podrás eliminarla si ya está vinculada a un pedido.`,
      'Eliminar dirección'
    );
    if (!confirmed) return;

    this.addressError.set(null);
    this.billingInformationService.delete(address.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        if (!response?.success) {
          this.addressError.set(response?.message || 'No se pudo eliminar la dirección.');
          return;
        }
        const remainingAddresses = this.billingAddresses().filter(item => item.id !== address.id);
        this.billingAddresses.set(remainingAddresses);
        if (this.selectedBillingInformationId() === address.id) {
          this.selectedBillingInformationId.set(remainingAddresses[0]?.id ?? null);
        }
        if (!remainingAddresses.length) this.openNewAddressForm();
      },
      error: error => {
        this.addressError.set(error?.status === 409
          ? 'No se puede eliminar esta dirección porque está vinculada a uno o más pedidos.'
          : error?.error?.message || 'No se pudo eliminar la dirección. Intenta nuevamente.');
      }
    });
  }

  onPlaceOrder(): void {
    if (this.isLoading()) return;

    if (!this.orderSummary().items.length) {
      this.dialogService.alert('Tu carrito está vacío.', 'Carrito vacío', 'warning');
      return;
    }

    const billingInformationId = this.selectedBillingInformationId();
    if (!billingInformationId || !this.billingAddresses().some(address => address.id === billingInformationId)) {
      this.error.set('Selecciona una dirección de facturación guardada antes de continuar.');
      return;
    }

    if (!this.orderId) {
      this.error.set('No se pudo validar el pedido. Intenta nuevamente.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.orderService.validateCurrentOrder(this.orderId).pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        this.isLoading.set(false);
        const rejectedItems = response?.data?.rejectedItems || [];
        if (!response?.success || response?.data?.valid !== true || rejectedItems.length) {
          this.rejectedItemIds.set(rejectedItems.map((item: any) => Number(item.itemId)).filter(Number.isFinite));
          this.error.set(rejectedItems.map((item: any) => item.message).filter(Boolean).join('. ') || response?.message || 'Hay productos que requieren atención antes de continuar.');
          return;
        }
        this.rejectedItemIds.set([]);
        const checkout: CheckoutRequest = {
          billingInformationId,
          paymentMethod: this.paymentMethod
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
    return isValidCouponCode(code);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  goToCart(): void {
    this.router.navigate(['/carrito']);
  }

  /* Private Methods */
  private loadBillingAddresses(): void {
    this.isLoadingAddresses.set(true);
    this.addressError.set(null);
    this.billingInformationService.list().pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        this.isLoadingAddresses.set(false);
        if (!response?.success || !Array.isArray(response.data)) {
          this.addressError.set(response?.message || 'No se pudieron cargar tus direcciones.');
          return;
        }
        const addresses = response.data;
        this.billingAddresses.set(addresses);
        const currentSelection = this.selectedBillingInformationId();
        if (!addresses.some(address => address.id === currentSelection)) {
          this.selectedBillingInformationId.set(addresses[0]?.id ?? null);
        }
        if (!addresses.length) this.openNewAddressForm();
      },
      error: error => {
        this.isLoadingAddresses.set(false);
        this.addressError.set(error?.error?.message || 'No se pudieron cargar tus direcciones. Intenta nuevamente.');
      }
    });
  }

  private createEmptyAddress(): BillingInformationInput {
    return {
      fullName: '',
      company: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'UY',
      phone: ''
    };
  }

  private normalizedAddressInput(): BillingInformationInput {
    const trimOptional = (value?: string) => value?.trim() || undefined;
    return {
      fullName: this.addressForm.fullName.trim(),
      addressLine1: this.addressForm.addressLine1.trim(),
      city: this.addressForm.city.trim(),
      postalCode: this.addressForm.postalCode.trim(),
      country: this.addressForm.country.trim(),
      company: trimOptional(this.addressForm.company),
      addressLine2: trimOptional(this.addressForm.addressLine2),
      state: trimOptional(this.addressForm.state),
      phone: trimOptional(this.addressForm.phone)
    };
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