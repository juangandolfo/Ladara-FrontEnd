import {Routes} from '@angular/router';
import {HomeComponent} from './components/home/home.component';
import {DashboardComponent} from './components/dashboard/dashboard.component';
import {CartComponent} from './components/cart/cart.component';
import {CheckoutComponent} from './components/checkout/checkout.component';
import {MyOrdersComponent} from './components/my-orders/my-orders.component';
import {AdminDashboardGuard, AdminHomeRedirectGuard, AuthGuard} from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    canActivate: [AdminHomeRedirectGuard]
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AdminDashboardGuard]
  },
  {
    path: 'carrito',
    component: CartComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'mis-compras',
    component: MyOrdersComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'checkout',
    component: CheckoutComponent,
    canActivate: [AuthGuard]
  },
  {path: '**', redirectTo: ''}
];
