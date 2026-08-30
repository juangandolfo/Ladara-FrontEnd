import {Routes} from '@angular/router';
import {HomeComponent} from './components/home/home.component';
import {CartComponent} from './components/cart/cart.component';
import {CheckoutComponent} from './components/checkout/checkout.component';
import {MyOrdersComponent} from './components/my-orders/my-orders.component';
import {AuthGuard} from './guards/auth.guard';

export const routes: Routes = [
  {path: '', component: HomeComponent},
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
