import {Component, computed, OnInit, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  discountedPrice?: number;
  quantity: number;
  type: string;
  image?: string;
  description?: string;
}

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css'],
  imports: [CommonModule],
})
export class CartComponent implements OnInit {

  constructor(private router: Router) {
  }

  cartItems = signal<CartItem[]>([
    {
      id: 1,
      name: 'Premium Wireless Headphones',
      price: 299.99,
      discountedPrice: 249.99,
      quantity: 1,
      type: 'Electronics',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop',
      description: 'High-quality wireless headphones with noise cancellation'
    },
    {
      id: 2,
      name: 'Organic Cotton T-Shirt',
      price: 49.99,
      quantity: 2,
      type: 'Clothing',
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop',
      description: 'Comfortable organic cotton t-shirt in multiple colors'
    },
    {
      id: 3,
      name: 'Smart Water Bottle',
      price: 79.99,
      discountedPrice: 59.99,
      quantity: 1,
      type: 'Accessories',
      image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&h=300&fit=crop',
      description: 'Temperature tracking smart water bottle with app connectivity'
    }
  ]);

  // Computed properties
  subtotal = computed(() => {
    return this.cartItems().reduce((total, item) => {
      const price = item.discountedPrice || item.price;
      return total + (price * item.quantity);
    }, 0);
  });

  totalItems = computed(() => {
    return this.cartItems().reduce((total, item) => total + item.quantity, 0);
  });

  totalSavings = computed(() => {
    return this.cartItems().reduce((total, item) => {
      if (item.discountedPrice) {
        return total + ((item.price - item.discountedPrice) * item.quantity);
      }
      return total;
    }, 0);
  });

  tax = computed(() => this.subtotal() * 0.08); // 8% tax
  total = computed(() => this.subtotal() + this.tax());

  ngOnInit(): void {
  }

  updateQuantity(itemId: number, newQuantity: number): void {
    if (newQuantity < 1) {
      this.removeItem(itemId);
      return;
    }

    this.cartItems.update(items =>
      items.map(item =>
        item.id === itemId ? {...item, quantity: newQuantity} : item
      )
    );
  }

  removeItem(itemId: number): void {
    this.cartItems.update(items => items.filter(item => item.id !== itemId));
  }

  clearCart(): void {
    this.cartItems.set([]);
  }

  proceedToCheckout(): void {
    // Implement checkout logic
    console.log('Proceeding to checkout with items:', this.cartItems());
  }


  continueShopping(): void {
    this.router.navigate(['/']);
  }
}
