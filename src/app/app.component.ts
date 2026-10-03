import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

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
  readonly navigation: NavigationGroup[] = [
    { title: 'Workspace', items: [{ label: 'Overview', path: '/dashboard' }] },
    { title: 'Fulfilment', items: [
      { label: 'Orders', path: '/orders' },
      { label: 'Order items', path: '/order-items' },
      { label: 'Prescriptions', path: '/prescriptions' },
    ] },
    { title: 'Pharmacy', items: [
      { label: 'Inventory', path: '/inventory' },
      { label: 'Branches', path: '/branches' },
      { label: 'Medicines', path: '/medicines' },
    ] },
    { title: 'Customer care', items: [
      { label: 'Customers', path: '/customers' },
      { label: 'Support requests', path: '/support-requests' },
    ] },
    { title: 'Marketing', items: [
      { label: 'Promotions', path: '/promotions' },
      { label: 'Coupons', path: '/coupons' },
    ] },
    { title: 'Staff records', items: [
      { label: 'Pharmacists', path: '/pharmacists' },
      { label: 'Pharmacy managers', path: '/pharmacy-managers' },
      { label: 'Marketing officers', path: '/marketing-officers' },
      { label: 'Support officers', path: '/customer-support-officers' },
    ] },
  ];

  constructor(private readonly router: Router) {
    this.updateTitle(router.url);
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(event => {
      this.updateTitle((event as NavigationEnd).urlAfterRedirects);
      this.mobileNavOpen = false;
    });
  }

  toggleNavigation(): void {
    this.mobileNavOpen = !this.mobileNavOpen;
  }

  private updateTitle(url: string): void {
    const path = url.split('?')[0];
    const item = this.navigation.flatMap(group => group.items).find(entry => entry.path === path);
    this.currentTitle = item?.label ?? 'Overview';
  }
}
