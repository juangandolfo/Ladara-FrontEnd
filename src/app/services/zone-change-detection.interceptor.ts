import { HttpInterceptorFn } from '@angular/common/http';
import { inject, NgZone } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Ensures HttpClient responses notify Angular even when a request was started
 * by a callback outside NgZone (for example, a browser or third-party callback).
 */
export const zoneChangeDetectionInterceptor: HttpInterceptorFn = (request, next) => {
  const zone = inject(NgZone);

  return new Observable(observer => next(request).subscribe({
    next: event => {
      if (NgZone.isInAngularZone()) observer.next(event);
      else zone.run(() => observer.next(event));
    },
    error: error => {
      if (NgZone.isInAngularZone()) observer.error(error);
      else zone.run(() => observer.error(error));
    },
    complete: () => {
      if (NgZone.isInAngularZone()) observer.complete();
      else zone.run(() => observer.complete());
    }
  }));
};
