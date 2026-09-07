import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Router} from '@angular/router';
import {Observable, catchError, map, of} from 'rxjs';

export interface AppUser {
  id?: number | string;
  email?: string;
  name?: string;
  isAdmin?: boolean;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private backendUrl = 'http://localhost:3000'; // Adjust this URL to your backend API

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
  }

  private normalizeUserPayload(payload: unknown): AppUser | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const candidate = (payload as { user?: AppUser }).user ?? (payload as AppUser);
    if (!candidate || typeof candidate !== 'object') {
      return null;
    }

    return {
      ...(candidate as AppUser),
      isAdmin: Boolean((candidate as AppUser).isAdmin ?? (payload as { isAdmin?: boolean }).isAdmin ?? false)
    };
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
      if (event.data?.token) {
        const user = this.normalizeUserPayload(event.data.user ?? event.data);
        localStorage.setItem('token', event.data.token);
        window.removeEventListener('message', messageListener);
        if (authWindow && !authWindow.closed) authWindow.close();
        // Trigger storage event for cross-tab communication
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'token',
          newValue: event.data.token
        }));

        if (this.isAdminUser(user)) {
          this.router.navigate(['/dashboard']);
        }
      }
    };

    window.addEventListener('message', messageListener);
  }

  getCurrentUser(): Observable<AppUser | null> {
    const token = localStorage.getItem('token');
    if (!token) return of(null);

    return this.http.get<{ user?: AppUser; isAdmin?: boolean } | AppUser>(`${this.backendUrl}/auth/me`, {
      headers: {Authorization: `Bearer ${token}`}
    }).pipe(
      map((payload) => {
        if (!payload) return null;

        const normalizedUser = (payload as { user?: AppUser }).user ?? payload as AppUser;
        const user = {
          ...(normalizedUser || {}),
          isAdmin: (normalizedUser?.isAdmin ?? (payload as { isAdmin?: boolean }).isAdmin ?? false) as boolean
        };

        return Object.keys(user).length ? user : null;
      }),
      catchError(() => of(null))
    );
  }

  isAdminUser(user?: AppUser | null): boolean {
    const normalized = (user as { user?: AppUser } | null)?.user ?? user;
    return normalized?.isAdmin === true;
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
