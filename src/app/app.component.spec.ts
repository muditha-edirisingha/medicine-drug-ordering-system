import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { AuthUser } from './core/models/auth.models';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let auth: { currentUser: AuthUser | null; logout: jasmine.Spy };

  beforeEach(async () => {
    auth = { currentUser: null, logout: jasmine.createSpy('logout') };
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('does not expose protected navigation while signed out', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.navigation.flatMap(group => group.items)).toEqual([]);
  });

  it('should render the application shell', () => {
    auth.currentUser = { userId: 7, username: 'manager', role: 'PHARMACY_MANAGER' };
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-copy strong')?.textContent).toContain('MedOrder');
    expect(compiled.querySelector('nav[aria-label="Main navigation"]')).toBeTruthy();
    expect(compiled.querySelectorAll('.nav-link-item').length).toBe(2);
  });

  it('shows only the customer portal navigation for customers', () => {
    auth.currentUser = { userId: 42, username: 'customer', role: 'CUSTOMER' };
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.nav-link-item'));
    expect(links.map(link => link.textContent?.trim())).toEqual([
      'Dashboard',
      'Medicines',
      'My Orders',
      'My Prescriptions',
      'Support',
    ]);
    expect(links.map(link => link.getAttribute('href'))).toEqual([
      '/customer/dashboard',
      '/customer/medicines',
      '/customer/orders',
      '/customer/prescriptions',
      '/customer/support',
    ]);
  });
});
