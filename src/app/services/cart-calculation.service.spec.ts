import { CartCalculationService } from './cart-calculation.service';

describe('CartCalculationService', () => {
  let service: CartCalculationService;

  beforeEach(() => {
    service = new CartCalculationService();
  });

  it('matches the cart component result for a single item with a valid coupon (FE-ACT-05)', () => {
    const result = service.calculate({
      itemTotals: [100],
      taxRate: 0.08,
      couponRate: 0.1,
      isCouponValid: true
    });

    expect(result.subtotal).toBe(100);
    expect(result.discount).toBe(10);
    expect(result.tax).toBe(7.2);
    expect(result.shipping).toBe(0);
    expect(result.total).toBe(97.2);
  });

  it('matches the cart component result when the coupon is removed', () => {
    const result = service.calculate({ itemTotals: [100], taxRate: 0.08 });

    expect(result.discount).toBe(0);
    expect(result.total).toBe(108);
  });

  it('matches the cart component result with backend shipping cost and authoritative total', () => {
    const result = service.calculate({
      itemTotals: [100],
      taxRate: 0.08,
      shipping: 15.5,
      authoritativeTotal: 123.5
    });

    expect(result.shipping).toBe(15.5);
    expect(result.total).toBe(123.5);
  });

  it('prefers an explicit backend discount override over the local coupon rate', () => {
    const result = service.calculate({
      itemTotals: [100],
      taxRate: 0.08,
      couponRate: 0.1,
      isCouponValid: true,
      discountOverride: 25
    });

    expect(result.discount).toBe(25);
    expect(result.taxableAmount).toBe(75);
    expect(result.tax).toBeCloseTo(6, 10);
    expect(result.total).toBeCloseTo(81, 10);
  });

  it('matches the checkout component result for a discounted item plus a regular item (coupon valid)', () => {
    const result = service.calculate({
      itemTotals: [20, 5], // (20 * 2 discounted line) then split into item totals as the component computes them
      taxRate: 0.08,
      couponRate: 0.1,
      isCouponValid: true
    });

    expect(result.subtotal).toBe(25);
    expect(result.discount).toBe(2.5);
    expect(result.tax).toBeCloseTo(1.8, 10);
    expect(result.total).toBeCloseTo(24.3, 10);
  });

  it('matches the checkout component result for an invalid coupon code', () => {
    const result = service.calculate({
      itemTotals: [25],
      taxRate: 0.08,
      couponRate: 0.1,
      isCouponValid: false
    });

    expect(result.discount).toBe(0);
  });

  it('returns all zeros for an empty cart', () => {
    const result = service.calculate({ itemTotals: [], taxRate: 0.08, couponRate: 0.1, isCouponValid: true });

    expect(result).toEqual({ subtotal: 0, discount: 0, taxableAmount: 0, tax: 0, shipping: 0, total: 0 });
  });

  it('clamps the taxable amount at zero when the discount exceeds the subtotal', () => {
    const result = service.calculate({
      itemTotals: [10],
      taxRate: 0.08,
      discountOverride: 50
    });

    expect(result.taxableAmount).toBe(0);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(0);
  });
});
