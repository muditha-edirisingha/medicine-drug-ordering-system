import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { AuthUser, UserRole, dashboardPathFor } from './core/models/auth.models';

interface NavigationItem {
  label: string;
  path: string;
}

interface NavigationGroup {
  title: string;
  items: NavigationItem[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  mobileNavOpen = false;
  currentTitle = 'Overview';
  currentUrl = '';
  private readonly navigationByRole: Record<UserRole, NavigationGroup[]> = {
    CUSTOMER: [
      { title: 'Customer', items: [
        { label: 'Dashboard', path: '/customer/dashboard' },
        { label: 'Medicines', path: '/customer/medicines' },
        { label: 'My Orders', path: '/customer/orders' },
        { label: 'My Prescriptions', path: '/customer/prescriptions' },
        { label: 'Support', path: '/customer/support' },
      ] },
    ],
    PHARMACIST: [
      { title: 'Workspace', items: [{ label: 'Overview', path: '/dashboard' }] },
      { title: 'Clinical', items: [
        { label: 'Prescriptions', path: '/prescriptions' },
        { label: 'Medicines', path: '/medicines' },
      ] },
    ],
    PHARMACY_MANAGER: [
      { title: 'Workspace', items: [{ label: 'Overview', path: '/dashboard' }] },
      { title: 'Pharmacy', items: [
        { label: 'Inventory', path: '/inventory' },
        { label: 'Branches', path: '/branches' },
        { label: 'Medicines', path: '/medicines' },
        { label: 'Pharmacists', path: '/pharmacists' },
        { label: 'Pharmacy managers', path: '/pharmacy-managers' },
        { label: 'Marketing officers', path: '/marketing-officers' },
        { label: 'Support officers', path: '/customer-support-officers' },
      ] },
    ],
    MARKETING_OFFICER: [
      { title: 'Workspace', items: [{ label: 'Overview', path: '/dashboard' }] },
      { title: 'Marketing', items: [
        { label: 'Promotions', path: '/promotions' },
        { label: 'Coupons', path: '/coupons' },
      ] },
    ],
    CUSTOMER_SUPPORT_OFFICER: [
      { title: 'Workspace', items: [{ label: 'Overview', path: '/dashboard' }] },
      { title: 'Customer care', items: [
        { label: 'Customers', path: '/customers' },
        { label: 'Support requests', path: '/support-requests' },
      ] },
    ],
  };
  readonly anonymousNavigation: NavigationGroup[] = [];

  constructor(
    private readonly router: Router,
    readonly auth: AuthService,
  ) {
    this.updateNavigation(router.url);
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(event => {
      this.updateNavigation((event as NavigationEnd).urlAfterRedirects);
      this.mobileNavOpen = false;
    });
  }

  get currentUser(): AuthUser | null {
    return this.auth.currentUser;
  }

  get navigation(): NavigationGroup[] {
    const role = this.currentUser?.role;
    return role ? this.navigationByRole[role] : this.anonymousNavigation;
  }

  get isPublicPage(): boolean {
    return !this.currentUser || this.currentUrl === '/login' || this.currentUrl.startsWith('/register/');
  }

  get roleLabel(): string {
    return this.currentUser?.role.replaceAll('_', ' ') ?? '';
  }

  logout(): void {
    this.auth.logout();
    this.mobileNavOpen = false;
    void this.router.navigateByUrl('/login');
  }

  toggleNavigation(): void {
    this.mobileNavOpen = !this.mobileNavOpen;
  }

  private updateNavigation(url: string): void {
    this.currentUrl = url.split('?')[0];
    const item = this.navigation.flatMap(group => group.items).find(entry => entry.path === this.currentUrl);
    this.currentTitle = item?.label ?? 'Overview';
  }

  get homePath(): string {
    return this.currentUser ? dashboardPathFor(this.currentUser.role) : '/login';
  }
}
