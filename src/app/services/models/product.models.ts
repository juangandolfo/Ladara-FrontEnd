export interface ProductFilterDto {
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  maxStock?: number;
  category?: string;
  name?: string;
  brand?: string;
  isActive?: boolean;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  brand: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  image: string;
  discountedPrice: number;
  deletedAt?: string;
}

export interface FilterMeta {
  total: number;
  count: number;
  appliedFilters: Partial<ProductFilterDto>;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  meta?: FilterMeta;
  error?: string;
}

export interface FilterProductsResponse {
  products: Product[];
  total: number;
  count: number;
  appliedFilters: Partial<ProductFilterDto>;
}

export type FilterProductsApiResponse = ApiResponse<Product[]> & {
  meta: FilterMeta;
};

export type ErrorResponse = ApiResponse<never> & {
  success: false;
  error: string;
};
