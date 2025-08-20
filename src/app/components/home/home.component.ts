import {Component, computed, effect, OnInit, signal} from '@angular/core';
  import {CommonModule, NgOptimizedImage} from '@angular/common';
  import {FormsModule} from '@angular/forms';
  import {Router} from '@angular/router';
  import {Product} from '../../models/product.model';
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

    productCategories = computed(() => {
      const categories = new Set(this.products().map(p => p.category));
      return Array.from(categories);
    });

    filteredProducts = computed(() => {
      return this.products();
    });

    totalPages = computed(() =>
      Math.ceil(this.filteredProducts().length / this.itemsPerPage())
    );

    paginatedProducts = computed(() => {
      const filtered = this.filteredProducts();
      const startIndex = (this.currentPage() - 1) * this.itemsPerPage();
      const endIndex = startIndex + this.itemsPerPage();
      return filtered.slice(startIndex, endIndex);
    });

    paginationInfo = computed(() => {
      const total = this.filteredProducts().length;
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
        this.currentPage.set(1);
      }
    }

    onSearch(event: Event) {
      const target = event.target as HTMLInputElement;
      this.searchTerm.set(target.value);
      this.currentPage.set(1);
    }

    toggleFilters() {
      this.showFilters.set(!this.showFilters());
      if (this.showFilters()) {
        this.selectedCategory.set('');
        this.searchTerm.set('');
        this.currentPage.set(1);
      }
    }

    onCategoryFilter(category: string) {
      this.selectedCategory.set(category);
      this.showFilters.set(false);
      this.currentPage.set(1);
    }

    clearFilters() {
      this.selectedCategory.set('');
      this.searchTerm.set('');
      this.showFilters.set(false);
      this.currentPage.set(1);
    }

    goToPage(page: number) {
      if (page >= 1 && page <= this.totalPages()) {
        this.currentPage.set(page);
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
      if (this.selectedCategory()) filters.category = this.selectedCategory();
      this.productService.filterProductsQuery(filters).subscribe(response => {
        this.products.set(response.data || []);
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
