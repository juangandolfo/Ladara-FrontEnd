export interface User {
  id: number;
  name: string;
  // Add other user fields as needed
}

export interface Product {
  id: number;
  name: string;
  price: number;
  // Add other product fields as needed
}

export interface OrderItem {
  id: number;
  order: Order;
  product: Product;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  user: User;
  createdAt: Date;
  total: number;
  items: OrderItem[];
  status: string; // 'pending', 'completed', etc.
}
