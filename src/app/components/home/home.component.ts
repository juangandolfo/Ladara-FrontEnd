import { Component, signal, computed } from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, NgOptimizedImage],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  searchTerm = signal('');
  selectedType = signal('');
  showFilters = signal(false);

  // Pagination signals
  currentPage = signal(1);
  itemsPerPage = signal(8); // Default items per page

  // Mock data - replace with actual service call
  products = signal<Product[]>([
    { id: 1, name: 'Laptop Pro', price: 1200, discountedPrice: 999, type: 'Electronics' },
    { id: 2, name: 'Wireless Headphones', price: 150, discountedPrice: 120, type: 'Electronics' },
    { id: 3, name: 'Running Shoes', price: 80, discountedPrice: 65, type: 'Sports' },
    { id: 4, name: 'Coffee Maker', price: 200, discountedPrice: 180, type: 'Home' },
    { id: 5, name: 'Book Collection', price: 50, discountedPrice: 35, type: 'Books' },
    { id: 6, name: 'Gaming Mouse', price: 60, discountedPrice: 45, type: 'Electronics' },
    { id: 7, name: 'Smartphone', price: 800, discountedPrice: 699, type: 'Electronics' },
    { id: 8, name: 'Yoga Mat', price: 40, discountedPrice: 30, type: 'Sports' },
    { id: 9, name: 'Blender', price: 120, discountedPrice: 95, type: 'Home' },
    { id: 10, name: 'Novel Series', price: 75, discountedPrice: 60, type: 'Books' },
    { id: 11, name: 'Keyboard', price: 90, discountedPrice: 70, type: 'Electronics' },
    { id: 12, name: 'Tennis Racket', price: 150, discountedPrice: 120, type: 'Sports' },
    { id: 13, name: 'Air Fryer', price: 180, discountedPrice: 150, type: 'Home' },
    { id: 14, name: 'Programming Books', price: 100, discountedPrice: 80, type: 'Books' },
    { id: 15, name: 'Monitor', price: 300, discountedPrice: 250, type: 'Electronics' }
  ]);

  productTypes = computed(() => {
    const types = new Set(this.products().map(p => p.type));
    return Array.from(types);
  });

  filteredProducts = computed(() => {
    let filtered = this.products();

    if (this.searchTerm()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(this.searchTerm().toLowerCase())
      );
    }

    if (this.selectedType()) {
      filtered = filtered.filter(product => product.type === this.selectedType());
    }

    return filtered;
  });

  // Pagination computed properties
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
    return { startItem, endItem, total };
  });

  visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | string)[] = [];

    if (total <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (current > 4) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, current - 2);
      const end = Math.min(total - 1, current + 2);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 3) {
        pages.push('...');
      }

      // Always show last page if more than 1 page
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
      this.currentPage.set(1); // Reset to first page on items per page change
    }
  }

  constructor(private router: Router) {}

  onSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
    this.currentPage.set(1); // Reset to first page on search
  }

  toggleFilters() {
    this.showFilters.set(!this.showFilters());
    if (this.showFilters()) {
      // Reset filters when opening
      this.selectedType.set('');
      this.searchTerm.set('');
      this.currentPage.set(1); // Reset to first page
    }
  }

  onTypeFilter(type: string) {
    this.selectedType.set(type);
    this.showFilters.set(false);
    this.currentPage.set(1); // Reset to first page on filter
  }

  clearFilters() {
    this.selectedType.set('');
    this.searchTerm.set('');
    this.showFilters.set(false);
    this.currentPage.set(1); // Reset to first page
  }

  // Pagination methods
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      // Scroll to top of products grid
      document.querySelector('.products-grid')?.scrollIntoView({ behavior: 'smooth' });
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
    // Implement login logic
    console.log('Login clicked');
  }

  getDiscountPercentage(price: number, discountedPrice: number): number {
    return Math.round(((price - discountedPrice) / price) * 100);
  }
}
