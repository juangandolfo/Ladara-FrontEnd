import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.authService.isLoggedIn()) {
      return true;
    }

    // Redirect to home page if not logged in
    this.router.navigate(['/']);
    return false;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AdminHomeRedirectGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.getCurrentUser().pipe(
      map((user) => {
        const isAdmin = this.authService.isAdminUser(user);

        if (isAdmin) {
          this.router.navigate(['/dashboard']);
          return false;
        }

        return true;
      }),
      catchError(() => of(true))
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class AdminDashboardGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.getCurrentUser().pipe(
      map((user) => {
        const isAdmin = this.authService.isAdminUser(user);

        if (isAdmin) {
          return true;
        }

        this.router.navigate(['/']);
        return false;
      }),
      catchError(() => {
        this.router.navigate(['/']);
        return of(false);
      })
    );
  }
}

