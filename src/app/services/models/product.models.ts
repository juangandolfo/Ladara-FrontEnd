import {ApiResponse} from './base.model';

export interface ProductFilterDto {
  id?: number;
  name?: string;
  description?: string;
  code?: string;
  price?: number;
  minPrice?: number;
  maxPrice?: number;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  sortBy?: 'id' | 'name' | 'price' | 'description' | 'code' | 'stock';
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
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

export interface FilterProductsResponse {
  products: Product[];
  total: number;
  count: number;
  appliedFilters: Partial<ProductFilterDto>;
}

export type FilterProductsApiResponse = ApiResponse<Product[]> & {
  meta: FilterMeta;
};
