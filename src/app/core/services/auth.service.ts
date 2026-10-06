import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { ApiService } from './api.service';
import {
  AuthUser,
  CustomerRegistrationRequest,
  LoginRequest,
  StaffRegistrationRequest,
  isUserRole,
} from '../models/auth.models';

const AUTH_STORAGE_KEY = 'medorder.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSubject = new BehaviorSubject<AuthUser | null>(this.readStoredUser());
  readonly user$ = this.userSubject.asObservable();

  constructor(private readonly api: ApiService) {}

  get currentUser(): AuthUser | null {
    return this.userSubject.value;
  }

  login(request: LoginRequest): Observable<AuthUser> {
    return this.api.post<AuthUser>('/auth/login', request).pipe(
      map(user => {
        if (!this.isValidUser(user)) {
          throw new Error('The login response did not contain a valid user and role.');
        }
        return user;
      }),
      tap(user => {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        this.userSubject.next(user);
      }),
    );
  }

  registerCustomer(request: CustomerRegistrationRequest): Observable<void> {
    return this.api.post<void>('/auth/register/customer', request);
  }

  registerStaff(request: StaffRegistrationRequest): Observable<void> {
    return this.api.post<void>('/auth/register/staff', request);
  }

  logout(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    this.userSubject.next(null);
  }

  private readStoredUser(): AuthUser | null {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;

    try {
      const user: unknown = JSON.parse(stored);
      if (this.isValidUser(user)) return user;
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }

  private isValidUser(value: unknown): value is AuthUser {
    if (!value || typeof value !== 'object') return false;
    const user = value as Partial<AuthUser>;
    return typeof user.userId === 'number'
      && typeof user.username === 'string'
      && isUserRole(user.role);
  }
}
