import { APP_CONFIG } from '../config/app.config';

/**
 * Normalizes a product image path coming from the backend into something
 * the browser can resolve directly: absolute/external URLs and data URIs
 * are kept as-is, relative paths are rooted at "/", and a missing/blank
 * image falls back to the shared default product image.
 */
export function normalizeProductImage(image?: string | null): string {
  const safeImage = image?.trim();

  if (!safeImage) {
    return APP_CONFIG.DEFAULT_PRODUCT_IMAGE;
  }

  if (
    safeImage.startsWith('http://') ||
    safeImage.startsWith('https://') ||
    safeImage.startsWith('/') ||
    safeImage.startsWith('data:')
  ) {
    return safeImage;
  }

  return `/${safeImage.replace(/^\.?\//, '')}`;
}

/** Parses a price-like value, defaulting to 0 when it isn't a finite number. */
export function parsePrice(price?: string | number): number {
  const parsed = typeof price === 'string' ? parseFloat(price) : price;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : 0;
}

/** Parses a price-like value, returning null when it isn't a finite number. */
export function parseOptionalPrice(price?: string | number): number | null {
  const parsed = typeof price === 'string' ? parseFloat(price) : price;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
}
