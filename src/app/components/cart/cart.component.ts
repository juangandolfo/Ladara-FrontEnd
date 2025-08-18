import {Component, OnInit} from '@angular/core';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  discountedPrice?: number;
  quantity: number;
  type: string;
}

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit {

  ngOnInit(): void {
  }
}
