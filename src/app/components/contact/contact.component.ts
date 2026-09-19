import {Component} from '@angular/core';
import {Router} from '@angular/router';

@Component({
  selector: 'app-contact',
  standalone: true,
  templateUrl: './contact.component.html'
})
export class ContactComponent {
  constructor(private readonly router: Router) {}

  goHome(): void {
    void this.router.navigate(['/']);
  }
}