import { normalizeProductImage, parseOptionalPrice, parsePrice } from './image-price.utils';

describe('image-price.utils', () => {
  describe('normalizeProductImage', () => {
    it('returns the default image when the value is missing or blank', () => {
      expect(normalizeProductImage(undefined)).toBe('/vacuna.jpg');
      expect(normalizeProductImage(null)).toBe('/vacuna.jpg');
      expect(normalizeProductImage('   ')).toBe('/vacuna.jpg');
    });

    it('keeps absolute http(s) URLs as-is', () => {
      expect(normalizeProductImage('http://cdn.example.com/a.png')).toBe('http://cdn.example.com/a.png');
      expect(normalizeProductImage('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
    });

    it('keeps data URIs and root-relative paths as-is', () => {
      expect(normalizeProductImage('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
      expect(normalizeProductImage('/already-rooted.jpg')).toBe('/already-rooted.jpg');
    });

    it('roots a plain filename and strips a leading "./"', () => {
      expect(normalizeProductImage('soap.jpg')).toBe('/soap.jpg');
      expect(normalizeProductImage('./soap.jpg')).toBe('/soap.jpg');
    });
  });

  describe('parsePrice', () => {
    it('returns the numeric value unchanged', () => {
      expect(parsePrice(19.99)).toBe(19.99);
    });

    it('parses numeric strings', () => {
      expect(parsePrice('19.99')).toBe(19.99);
    });

    it('defaults to 0 for undefined, NaN or non-numeric strings', () => {
      expect(parsePrice(undefined)).toBe(0);
      expect(parsePrice('abc')).toBe(0);
      expect(parsePrice(NaN)).toBe(0);
    });
  });

  describe('parseOptionalPrice', () => {
    it('returns the numeric value unchanged', () => {
      expect(parseOptionalPrice(19.99)).toBe(19.99);
    });

    it('parses numeric strings', () => {
      expect(parseOptionalPrice('19.99')).toBe(19.99);
    });

    it('returns null for undefined, NaN or non-numeric strings', () => {
      expect(parseOptionalPrice(undefined)).toBeNull();
      expect(parseOptionalPrice('abc')).toBeNull();
      expect(parseOptionalPrice(NaN)).toBeNull();
    });
  });
});
