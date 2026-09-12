import {Component, signal} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {DialogComponent} from './components/dialog/dialog.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('ladara-frontend');
}
