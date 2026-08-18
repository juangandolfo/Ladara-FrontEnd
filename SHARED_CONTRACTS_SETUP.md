# Frontend Shared Contracts Integration Guide

## Installation

The shared contracts from `@ladara/shared-contracts` have been added to your frontend dependencies.

```bash
npm install
```

## What's Included

### 1. **ApiClientService** (`api-client.service.ts`)
A wrapper service around Angular's HttpClient that uses shared contracts for type-safe API calls.

### 2. **Shared Types** from `@ladara/shared-contracts`
- DTOs: `OrderDto`, `ProductFilterDto`, `CreateProductDto`, etc.
- Enums: `OrderStatus`, `DiscountType`
- Interfaces: `User`, `Order`, `Product`, `Discount`
- Response wrappers: `ApiResponse<T>`, `SuccessResponse<T>`, `FailureResponse`

### 3. **Error Handling**
Type-safe error handling with proper error codes and retry logic.

### 4. **API Routes**
Type-safe endpoint builders using `ApiRoutes` from the shared contracts.

## Quick Start

### Import Types

```typescript
import {
  OrderDto,
  ProductFilterDto,
  OrderStatus,
  ApiRoutes
} from '@ladara/shared-contracts';
```

### Use ApiClientService

```typescript
import { ApiClientService } from './services/api-client.service';

export class ProductComponent {
  constructor(private api: ApiClientService) {}

  loadProducts(): void {
    const filters: ProductFilterDto = {
      category: 'Electronics',
      limit: 20
    };

    this.api.getProducts<any>(filters).subscribe({
      next: (response) => {
        console.log('Products:', response.data);
      },
      error: (error) => {
        console.error('Error loading products:', error.message);
      }
    });
  }
}
```

### Handle Authentication

```typescript
// Set token after login
this.api.setToken(token);

// Check if authenticated
if (this.api.isAuthenticated()) {
  // Show authenticated UI
}

// Clear token on logout
this.api.clearToken();
```

### Type-Safe Order Operations

```typescript
import { AddItemToOrderDto, OrderStatus } from '@ladara/shared-contracts';

addToCart(productId: number, quantity: number): void {
  const item: AddItemToOrderDto = {
    productId,
    quantity
  };

  this.api.addItemToOrder(orderId, item).subscribe({
    next: (response) => {
      if (response.data?.status === OrderStatus.CART) {
        console.log('Item added to cart');
      }
    },
    error: (error) => {
      console.error('Failed to add item:', error);
    }
  });
}
```

### Error Handling

```typescript
import { ApiError, shouldLogoutOnError } from '@ladara/shared-contracts';

loadData(): void {
  this.api.getData().subscribe({
    error: (error: ApiError) => {
      // Check if auth error
      if (error.isAuthError()) {
        this.authService.logout();
      }

      // Check if retriable
      if (error.isRetriable()) {
        this.retryWithBackoff();
      }

      // Show user-friendly message
      this.showError(error.getDisplayMessage());
    }
  });
}
```

## Examples

See `contracts-examples.service.ts` for comprehensive usage examples including:
- Product filtering with types
- Order operations
- Error handling patterns
- Discount management
- User authentication
- API URL building
- Resource creation

## Best Practices

### 1. Always Use Typed DTOs

```typescript
// ✅ Good
const filters: ProductFilterDto = { category: 'Electronics' };

// ❌ Avoid
const filters = { category: 'Electronics' } as any;
```

### 2. Use ApiRoutes for Endpoints

```typescript
// ✅ Good
const url = ApiRoutes.products.getById(id);

// ❌ Avoid
const url = `/products/${id}`;
```

### 3. Handle Errors Properly

```typescript
// ✅ Good
if (error.isAuthError()) {
  this.logout();
}

// ❌ Avoid
if (error.statusCode === 401) {
  // Magic numbers
}
```

### 4. Leverage Type Guards

```typescript
// ✅ Good
if (isOrderStatus(value)) {
  // value is OrderStatus
}

// ❌ Avoid
if (['cart', 'preparing', 'completed'].includes(value)) {
  // No type safety
}
```

## Common Patterns

### Loading Products with Filters

```typescript
loadProducts(category?: string): void {
  const filters: ProductFilterDto = {
    category,
    limit: 20,
    offset: 0,
    sortBy: 'price',
    sortOrder: 'ASC'
  };

  this.api.getProducts<any>(filters).subscribe({
    next: (response) => {
      this.products = response.data?.products || [];
    },
    error: (error) => {
      this.showError(error.getDisplayMessage());
    }
  });
}
```

### Managing Cart

```typescript
getCurrentCart(): void {
  this.api.getCurrentOrder<any>().subscribe({
    next: (response) => {
      if (response.success && response.data) {
        this.cart = response.data;
      }
    },
    error: (error) => {
      console.error('Cart error:', error);
    }
  });
}

addToCart(product: Product, quantity: number): void {
  const item: AddItemToOrderDto = { productId: product.id, quantity };
  
  this.api.addItemToOrder(this.cartId, item).subscribe({
    next: () => this.getCurrentCart(),
    error: (error) => this.handleError(error)
  });
}
```

### Admin Operations

```typescript
createProduct(data: CreateProductDto): void {
  this.api.post<any>(ApiRoutes.products.create, data).subscribe({
    next: (response) => {
      if (response.success) {
        this.showSuccess('Product created');
      }
    },
    error: (error) => {
      if (error.code === 'ADMIN_REQUIRED') {
        this.showError('Admin privileges required');
      }
    }
  });
}
```

## Available Enums

### OrderStatus
```typescript
- OrderStatus.CART       // Active shopping cart
- OrderStatus.PREPARING  // Being prepared
- OrderStatus.COMPLETED  // Completed
```

### DiscountType
```typescript
- DiscountType.FIXED     // Fixed amount ($10 off)
- DiscountType.PERCENT   // Percentage (20% off)
```

### ApiErrorCode
Multiple error codes available for handling specific errors:
- `UNAUTHORIZED`, `FORBIDDEN`, `TOKEN_EXPIRED`
- `VALIDATION_ERROR`, `INVALID_REQUEST`
- `NOT_FOUND`, `RESOURCE_NOT_FOUND`
- And many more...

## Updating Shared Contracts

When the backend updates shared contracts:

```bash
# Pull latest from backend
cd ../Ladara-BackEnd
git pull

# Reinstall in frontend
cd ../Ladara-FrontEnd
npm install
```

Or if using npm workspaces, the types will automatically update.

## Troubleshooting

### Types Not Recognized
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### TypeScript Errors
```bash
# Rebuild shared contracts
cd ../Ladara-BackEnd/documentation/frontend-contracts
npm run build
```

### API Calls Failing
1. Check if token is set: `this.api.getToken()`
2. Verify API base URL: `this.api.getApiBaseUrl()`
3. Check console for error details
4. Review error code in `ApiErrorCode`

## Related Documentation

- [API Contracts](../../documentation/API.md)
- [DTOs](../../documentation/DTOS.md)
- [Error Handling](../../documentation/frontend-contracts/errors.ts)
- [API Endpoints](../../documentation/frontend-contracts/api-endpoints.ts)

## Support

For issues or questions:
1. Check [Frontend Contracts Examples](contracts-examples.service.ts)
2. Review [Backend Documentation](../../documentation/README.md)
3. Check error code in ApiErrorCode enum
