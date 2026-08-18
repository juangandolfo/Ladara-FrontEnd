/**
 * Shared Contracts Usage Examples
 * 
 * This file demonstrates how to use types and contracts from @ladara/shared-contracts
 */

import { Injectable } from '@angular/core';
import {
  // Types and Interfaces
  OrderDto,
  ProductFilterDto,
  CreateProductDto,
  AddItemToOrderDto,
  User,
  Order,
  Product,
  Discount,
  
  // Enums
  OrderStatus,
  DiscountType,
  
  // API Routes
  ApiRoutes,
  
  // Error Handling
  ApiError,
  ApiErrorCode,
  parseApiError,
  shouldLogoutOnError,
  
  // Response Types
  ApiResponse,
  SuccessResponse,
  FailureResponse
} from '@ladara/shared-contracts';

@Injectable({
  providedIn: 'root'
})
export class ContractsExamplesService {

  /**
   * Example 1: Using types for products
   */
  exampleProductFilter(): void {
    // Define filters with type safety
    const filters: ProductFilterDto = {
      category: 'Electronics',
      minPrice: 50,
      maxPrice: 500,
      sortBy: 'price',
      sortOrder: 'ASC',
      limit: 20,
      offset: 0
    };

    // Use API routes to get typed URL
    const url = ApiRoutes.products.query(filters);
    console.log('Product query URL:', url);
    // Output: http://localhost:3000/products/query?category=Electronics&minPrice=50...
  }

  /**
   * Example 2: Type-safe order operations
   */
  exampleOrderOperations(): void {
    // Create order item with type checking
    const item: AddItemToOrderDto = {
      productId: 1,
      quantity: 2
    };

    // Order is typed
    const order: OrderDto = {
      id: 1,
      userId: 'user-123',
      status: OrderStatus.CART, // Only valid OrderStatus values
      total: 99.99,
      createdAt: new Date().toISOString(),
      items: []
    };

    console.log('Order status:', order.status);
  }

  /**
   * Example 3: Error handling with types
   */
  exampleErrorHandling(error: any): void {
    // Parse error with proper typing
    const apiError = parseApiError(error);

    // Check error type
    if (apiError.isAuthError()) {
      console.log('Auth error - needs login');
    }

    if (apiError.isValidationError()) {
      console.log('Validation failed:', apiError.details);
    }

    if (apiError.isRetriable()) {
      console.log('Can retry request');
    }

    // Check if should logout
    if (shouldLogoutOnError(apiError)) {
      console.log('Need to logout user');
    }

    // Get user-friendly message
    const message = apiError.getDisplayMessage();
    console.log('Display to user:', message);
  }

  /**
   * Example 4: Type-safe API responses
   */
  exampleApiResponses(): void {
    // Success response
    const successResponse: SuccessResponse<OrderDto> = {
      success: true,
      message: 'Order retrieved',
      data: {
        id: 1,
        userId: 'user-123',
        status: OrderStatus.CART,
        total: 99.99,
        createdAt: new Date().toISOString()
      }
    };

    // Failure response
    const failureResponse: FailureResponse = {
      success: false,
      message: 'Order not found',
      error: 'Resource not found'
    };

    // Generic response wrapper
    const genericResponse: ApiResponse<Product> = {
      success: true,
      message: 'Product found',
      data: {
        id: 1,
        name: 'Laptop',
        price: 999.99,
        stock: 10,
        category: 'Electronics',
        image: 'url'
      }
    };
  }

  /**
   * Example 5: Discount operations
   */
  exampleDiscountOperations(): void {
    // Create discount with type safety
    const discount: Discount = {
      id: 1,
      userId: 'user-123',
      value: 10,
      type: DiscountType.FIXED, // Fixed or Percent only
      description: 'Summer sale',
      usesLeft: 5
    };

    // Check discount type
    if (discount.type === DiscountType.FIXED) {
      console.log(`$${discount.value} off`);
    } else if (discount.type === DiscountType.PERCENT) {
      console.log(`${discount.value}% off`);
    }

    // Check unlimited vs limited
    if (discount.usesLeft === null) {
      console.log('Unlimited uses');
    } else if (discount.usesLeft > 0) {
      console.log(`${discount.usesLeft} uses left`);
    }
  }

  /**
   * Example 6: User authentication
   */
  exampleUserHandling(): void {
    // Type-safe user object
    const user: User = {
      id: 'google-id-123',
      name: 'John Doe',
      isAdmin: false
    };

    // Check permissions
    if (user.isAdmin) {
      console.log('User is admin - show admin panel');
    } else {
      console.log('Regular user - show customer panel');
    }
  }

  /**
   * Example 7: Building API URLs
   */
  exampleBuildingUrls(): void {
    // Type-safe endpoint building
    const productUrl = ApiRoutes.products.getById(1);
    const orderUrl = ApiRoutes.orders.addItem(5);
    const discountUrl = ApiRoutes.discounts.update(10);

    console.log('Product URL:', productUrl);
    console.log('Order URL:', orderUrl);
    console.log('Discount URL:', discountUrl);
  }

  /**
   * Example 8: Creating resources
   */
  exampleCreateResource(): void {
    // Create product with type checking
    const product: CreateProductDto = {
      name: 'New Laptop',
      price: 999.99,
      category: 'Electronics',
      image: 'https://...',
      description: 'High-performance laptop',
      code: 'LAP-001',
      stock: 50
    };

    console.log('Ready to POST:', product);
  }
}

/**
 * Type Guards for Runtime Safety
 */

export function isOrderStatus(value: any): value is OrderStatus {
  return Object.values(OrderStatus).includes(value);
}

export function isDiscountType(value: any): value is DiscountType {
  return Object.values(DiscountType).includes(value);
}

export function isSuccessResponse<T>(
  response: any
): response is SuccessResponse<T> {
  return response.success === true && 'data' in response;
}

export function isFailureResponse(response: any): response is FailureResponse {
  return response.success === false;
}

export function isApiError(error: any): error is ApiError {
  return error instanceof ApiError;
}
