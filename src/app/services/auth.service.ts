import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private backendUrl = 'http://localhost:3000'; // Adjust this URL to your backend API

  constructor(private http: HttpClient) {
  }

  loginWithGoogle(): void {
    const backendOrigin = new URL(this.backendUrl).origin;
    const authWindow = window.open(
      `${this.backendUrl}/auth/google`,
      'Google Login',
      'width=500,height=600'
    );

    const messageListener = (event: MessageEvent) => {
      if (event.origin !== backendOrigin) return;
      if (event.data?.token && event.data?.user) {
        localStorage.setItem('token', event.data.token);
        window.removeEventListener('message', messageListener);
        if (authWindow && !authWindow.closed) authWindow.close();
        // Trigger storage event for cross-tab communication
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'token',
          newValue: event.data.token
        }));
      }
    };

    window.addEventListener('message', messageListener);
  }

  getCurrentUser(): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) return of(null);
    return this.http.get(`${this.backendUrl}/auth/me`, {
      headers: {Authorization: `Bearer ${token}`}
    });
  }

  logout(): void {
    localStorage.removeItem('token');
    // Trigger storage event for cross-tab communication
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'token',
      newValue: null
    }));
  }

  isLoggedIn(): boolean {
    return localStorage.getItem('token') !== null;
  }
}
