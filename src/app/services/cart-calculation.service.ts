import { Injectable } from '@angular/core';

/**
 * Pure totals roll-up shared by the cart and checkout order summaries.
 *
 * This intentionally only covers the final arithmetic (subtotal -> discount
 * -> tax -> shipping -> total). The per-item "effective price" resolution
 * (whether to use `price` or `discountedPrice`) still lives in each
 * component because cart and checkout resolve it slightly differently today
 * (see CartCalculationService class doc below for details) and unifying
 * that would change observable behavior, which is out of scope here.
 */
export interface CartTotalsInput {
  /** Pre-resolved total for each cart/order line (effective price * quantity). */
  itemTotals: number[];
  /** Tax rate applied to the taxable amount (e.g. 0.08 for 8%). */
  taxRate: number;
  /** Discount rate applied to the subtotal when the coupon is valid and no explicit override is given (e.g. 0.1 for 10%). */
  couponRate?: number;
  /** Whether the active coupon code is valid; used together with couponRate when discountOverride is not provided. */
  isCouponValid?: boolean;
  /** Explicit discount amount (e.g. backend-validated coupon) that takes priority over the couponRate calculation. */
  discountOverride?: number | null;
  /** Shipping/delivery cost added after tax. Defaults to 0. */
  shipping?: number;
  /** Backend-authoritative total that overrides the locally calculated total when present. */
  authoritativeTotal?: number | null;
}

export interface CartTotalsResult {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  tax: number;
  shipping: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartCalculationService {
  /**
   * Known discrepancy between cart.component.ts and checkout.component.ts
   * (documented, not fixed here to avoid changing observable behavior):
   * - cart.component.ts resolves an item's effective price with
   *   `item.discountedPrice ?? item.price`, which treats a `discountedPrice`
   *   of 0 (or a negative value) as the real price.
   * - checkout.component.ts resolves it with
   *   `item.discountedPrice && item.discountedPrice > 0 ? item.discountedPrice : item.price`,
   *   which falls back to `price` whenever `discountedPrice` is 0 or negative.
   * In practice cart.component.ts never populates `discountedPrice` from the
   * backend order response, so this difference is currently unreachable in
   * production but is exercised by unit tests that set cartItems directly.
   */
  calculate(input: CartTotalsInput): CartTotalsResult {
    const subtotal = input.itemTotals.reduce((sum, itemTotal) => sum + itemTotal, 0);

    const couponDiscount = (input.isCouponValid ?? false) ? subtotal * (input.couponRate ?? 0) : 0;
    const discount = input.discountOverride ?? couponDiscount;

    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = taxableAmount * input.taxRate;
    const shipping = input.shipping ?? 0;
    const calculatedTotal = taxableAmount + tax + shipping;
    const total = input.authoritativeTotal ?? calculatedTotal;

    return { subtotal, discount, taxableAmount, tax, shipping, total };
  }
}
