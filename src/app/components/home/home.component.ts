import {Component, computed, effect, OnInit, signal} from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {Product} from '../../services/models/product.models';
import {ProductService} from '../../services/product.service';
import {OrderService} from '../../services/order.service';
import {AuthService} from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, NgOptimizedImage],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  searchTerm = signal('');
  selectedCategory = signal('');
  showFilters = signal(false);

  currentPage = signal(1);
  itemsPerPage = signal(8);
  totalCount = signal(0);

  categories = signal<string[]>([]);

  products = signal<Product[]>([]);
  currentOrderId = 1;
  isLoggedIn = false;

  ngOnInit() {
    this.isLoggedIn = !!localStorage.getItem('userId');
    const cachedId = this.getCartIdFromCache();
    if (cachedId) {
      this.currentOrderId = cachedId;
    } else {
      this.orderService.getCurrentOrder().subscribe({
        next: (order: any) => {
          if (order && order.id) {
            this.setCartIdInCache(order.id);
            this.currentOrderId = order.id;
          } else {
            this.orderService.createOrder().subscribe({
              next: (order: any) => {
                this.currentOrderId = order.id;
                this.setCartIdInCache(order.id);
              },
              error: (err: any) => {
                console.error('Error creating order:', err);
              }
            });
          }
        },
        error: (err: any) => {
          console.error('Error fetching current order:', err);
        }
      });
    }
    this.productService.getAllCategories().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.categories.set(['Todas', ...response.data]);
        }
      },
      error: (error) => {
        console.error('Error fetching categories:', error);
      }
    });

  }

  constructor(
    private router: Router,
    private productService: ProductService,
    private orderService: OrderService,
    private authService: AuthService
  ) {
    const cachedId = this.getCartIdFromCache();
    this.currentOrderId = cachedId ?? 1;
    effect(() => {
      this.fetchFilteredProducts();
    });
  }

  filteredProducts = computed(() => {
    return this.products();
  });

  totalPages = computed(() =>
    Math.ceil(this.totalCount() / this.itemsPerPage())
  );

  paginatedProducts = computed(() => {
    return this.products(); // Backend already returns paginated results
  });

  paginationInfo = computed(() => {
    const total = this.totalCount();
    const startItem = total === 0 ? 0 : (this.currentPage() - 1) * this.itemsPerPage() + 1;
    const endItem = Math.min(this.currentPage() * this.itemsPerPage(), total);
    return {startItem, endItem, total};
  });

  visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (current > 4) {
        pages.push('...');
      }
      const start = Math.max(2, current - 2);
      const end = Math.min(total - 1, current + 2);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (current < total - 3) {
        pages.push('...');
      }
      if (total > 1) {
        pages.push(total);
      }
    }
    return pages;
  });

  onItemsPerPageChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const value = parseInt(target.value, 10);
    if (!isNaN(value) && value > 0) {
      this.itemsPerPage.set(value);
      this.currentPage.set(1); // Reset to first page when changing items per page
      this.fetchFilteredProducts(); // Explicitly fetch new data
    }
  }

  onSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
    this.currentPage.set(1); // Reset to first page when searching
    this.fetchFilteredProducts(); // Explicitly fetch new data from backend
  }

  toggleFilters() {
    this.showFilters.set(!this.showFilters());
  }

  onCategoryFilter(category: string) {
    this.selectedCategory.set(category);
    this.showFilters.set(false);
    this.currentPage.set(1); // Reset to first page when filtering
  }

  clearFilters() {
    this.selectedCategory.set('');
    this.searchTerm.set('');
    this.showFilters.set(false);
    this.currentPage.set(1); // Reset to first page when clearing filters
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.fetchFilteredProducts(); // Fetch new page data from backend
      document.querySelector('.products-grid')?.scrollIntoView({behavior: 'smooth'});
    }
  }

  previousPage() {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage() {
    this.goToPage(this.currentPage() + 1);
  }

  goToCart() {
    this.router.navigate(['/cart']);
  }

  login() {
    this.authService.loginWithGoogle();
  }

  logout() {
    localStorage.removeItem('userId');
    this.isLoggedIn = false;
    this.router.navigate(['/']);
  }

  getDiscountPercentage(price: number, discountedPrice: number): number {
    return Math.round(((price - discountedPrice) / price) * 100);
  }

  fetchFilteredProducts() {
    const filters: any = {};
    if (this.searchTerm()) filters.name = this.searchTerm();
    if (this.selectedCategory() && this.selectedCategory() !== 'Todas') filters.category = this.selectedCategory();

    // Add pagination parameters
    filters.limit = this.itemsPerPage();
    filters.offset = (this.currentPage() - 1) * this.itemsPerPage();

    this.productService.filterProductsQuery(filters).subscribe(response => {
      this.products.set(response.data || []);
      this.totalCount.set(response.meta.total || 0); // Assuming backend returns total count
    });
  }

  setCartIdInCache(orderId: number) {
    localStorage.setItem('cartOrderId', orderId.toString());
  }

  getCartIdFromCache(): number | null {
    const id = localStorage.getItem('cartOrderId');
    return id ? parseInt(id, 10) : null;
  }

  addToCart(productId: number, quantity: number = 1) {
    this.orderService.addItemToOrder(this.currentOrderId, productId, quantity)
      .subscribe({
        next: (item) => {
          console.log('Product added to cart:', item);
        },
        error: (err) => {
          console.error('Error adding to cart:', err);
        }
      });
  }
}
