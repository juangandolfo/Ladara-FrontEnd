// Centralized application configuration shared across components/services.
// Keeping these values in one place avoids silent drift between the cart,
// checkout and home flows (tax rate, coupon code, placeholder image, etc).
export const APP_CONFIG = {
  /** VAT/sales tax rate applied to the taxable amount of an order. */
  TAX_RATE: 0.08,
  /** Discount rate applied to the subtotal when a valid coupon is active. */
  COUPON_DISCOUNT_RATE: 0.1,
  /** Only coupon code currently supported by the storefront. */
  VALID_COUPON_CODE: 'DISCOUNT10',
  /** Fallback image shown when a product has no image of its own. */
  DEFAULT_PRODUCT_IMAGE: '/vacuna.jpg'
} as const;

/** Returns whether the given coupon code is recognized as valid. */
export function isValidCouponCode(code: string): boolean {
  return code === APP_CONFIG.VALID_COUPON_CODE;
}
