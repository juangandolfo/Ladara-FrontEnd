import { APP_CONFIG, isValidCouponCode } from './app.config';

describe('AppConfig', () => {
  it('exposes the expected shared constants', () => {
    expect(APP_CONFIG.TAX_RATE).toBe(0.08);
    expect(APP_CONFIG.COUPON_DISCOUNT_RATE).toBe(0.1);
    expect(APP_CONFIG.VALID_COUPON_CODE).toBe('DISCOUNT10');
    expect(APP_CONFIG.DEFAULT_PRODUCT_IMAGE).toBe('/vacuna.jpg');
  });

  describe('isValidCouponCode', () => {
    it('accepts the recognized coupon code', () => {
      expect(isValidCouponCode('DISCOUNT10')).toBe(true);
    });

    it('rejects codes with different casing', () => {
      expect(isValidCouponCode('discount10')).toBe(false);
    });

    it('rejects unknown or empty codes', () => {
      expect(isValidCouponCode('UNKNOWN')).toBe(false);
      expect(isValidCouponCode('')).toBe(false);
    });
  });
});
