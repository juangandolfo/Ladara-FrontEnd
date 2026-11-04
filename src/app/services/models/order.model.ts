import {ApiResponse} from './base.model';

export interface AddItemToOrderDto {
  productId: number;
  quantity: number;
}

export type OrderPaymentMethod = 'bank_transfer' | 'cash';
export type OrderPaymentStatus = 'unpaid' | 'paid';

export interface BillingAddressDto {
  fullName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface CheckoutOrderDto {
  billingAddress: BillingAddressDto;
  paymentMethod: OrderPaymentMethod;
}

export interface OrderFulfillmentUpdateDto {
  paymentStatus?: OrderPaymentStatus;
  paymentReference?: string | null;
  invoiceIssued?: boolean;
  invoiceIdentifier?: string | null;
  isDelivered?: boolean;
  deliveryDocumentIdentifier?: string | null;
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
  shippingCost: number;
  createdAt: string;
  updatedAt: string;
  billingAddress?: BillingAddressDto;
  paymentMethod?: OrderPaymentMethod | null;
  checkoutAt?: string;
  paymentStatus: OrderPaymentStatus;
  paymentReference: string | null;
  paidAt: string | null;
  invoiceIdentifier: string | null;
  invoiceIssuedAt: string | null;
  isDelivered: boolean;
  deliveredAt: string | null;
  deliveryDocumentIdentifier: string | null;
  completedAt: string | null;
  items?: OrderItemDto[];
}


export interface CreateOrderResponse extends ApiResponse<OrderDto> {}
export interface GetOrderResponse extends ApiResponse<OrderDto> {}
export interface GetCurrentOrderResponse extends ApiResponse<OrderDto[]> {}
export interface GetCategoriesResponse extends ApiResponse<string[]> {}
export interface CancelOrderResponse extends ApiResponse<OrderDto> {}
export interface AddItemResponse extends ApiResponse<OrderItemDto> {}
export interface DeleteItemResponse extends ApiResponse<never> {
  message: string;
}
