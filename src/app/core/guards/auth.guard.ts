import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole, dashboardPathFor } from '../models/auth.models';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.currentUser) return true;
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.currentUser
    ? router.parseUrl(dashboardPathFor(auth.currentUser.role))
    : true;
};

export const roleGuard: CanActivateFn = route => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = route.data['roles'] as UserRole[] | undefined;
  const user = auth.currentUser;

  if (!user) {
    return router.createUrlTree(['/login']);
  }
  if (!allowedRoles?.includes(user.role)) {
    return router.parseUrl(dashboardPathFor(user.role));
  }
  return true;
};
