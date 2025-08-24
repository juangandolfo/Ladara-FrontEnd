import {ApiResponse} from './base.model';

export interface AddItemToOrderDto {
  productId: number;
  quantity: number;
}

export interface OrderItemDto {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  total: number;
  product?: {
    id: number;
    name: string;
    price: number;
  };
}

export interface OrderDto {
  id: number;
  userId: number;
  status: string;
  total: number;
  createdAt: string;
  updatedAt: string;
  items?: OrderItemDto[];
}


export interface CreateOrderResponse extends ApiResponse<OrderDto> {}
export interface GetOrderResponse extends ApiResponse<OrderDto> {}
export interface GetCurrentOrderResponse extends ApiResponse<OrderDto[]> {}
export interface GetCategoriesResponse extends ApiResponse<string[]> {}
export interface CancelOrderResponse extends ApiResponse<OrderDto> {}
export interface CompleteOrderResponse extends ApiResponse<OrderDto> {}
export interface AddItemResponse extends ApiResponse<OrderItemDto> {}
export interface DeleteItemResponse extends ApiResponse<never> {
  message: string;
}
