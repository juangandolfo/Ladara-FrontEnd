// Shared cart item shape used by cart, checkout and related components.
export interface CartItem {
  id: number;
  name: string;
  price: number;
  discountedPrice?: number;
  quantity: number;
  category: string;
  image?: string;
  description?: string;
  itemId?: number; // Backend item ID for API calls
  productId?: number; // Product ID for backend
  stock?: number;
  previousPrice?: number;
  priceChanged?: boolean;
}
