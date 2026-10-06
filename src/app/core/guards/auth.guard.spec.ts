import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard, roleGuard } from './auth.guard';

describe('authentication route guards', () => {
  let auth: { currentUser: AuthService['currentUser'] };
  let router: Router;

  beforeEach(() => {
    auth = { currentUser: null };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('redirects anonymous users to login and remembers the requested route', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/inventory' } as RouterStateSnapshot),
    );

    expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>))
      .toBe('/login?returnUrl=%2Finventory');
  });

  it('allows roles listed by the route', () => {
    auth.currentUser = { userId: 3, username: 'manager', role: 'PHARMACY_MANAGER' };

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(
        { data: { roles: ['PHARMACY_MANAGER'] } } as unknown as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      ),
    );

    expect(result).toBeTrue();
  });

  it('redirects a signed-in user to their own workspace when a role is not allowed', () => {
    auth.currentUser = { userId: 5, username: 'marketer', role: 'MARKETING_OFFICER' };

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(
        { data: { roles: ['PHARMACY_MANAGER'] } } as unknown as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      ),
    );

    expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/promotions');
  });
});
