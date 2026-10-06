import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('logs in with the backend contract and persists the returned role', () => {
    let loggedInUser = auth.currentUser;
    auth.login({ username: 'pharmacist', password: 'secret' }).subscribe(user => {
      loggedInUser = user;
    });

    const request = http.expectOne('http://localhost:8080/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ username: 'pharmacist', password: 'secret' });
    request.flush({ userId: 12, username: 'pharmacist', role: 'PHARMACIST' });

    expect(loggedInUser).toEqual({ userId: 12, username: 'pharmacist', role: 'PHARMACIST' });
    expect(auth.currentUser).toEqual(loggedInUser);
    expect(JSON.parse(localStorage.getItem('medorder.user') ?? 'null')).toEqual(loggedInUser);
  });

  it('posts customer and staff registrations to their respective backend routes', () => {
    const customer = {
      firstName: 'Ari',
      lastName: 'Lee',
      email: 'ari@example.test',
      phoneNo: '555-0100',
      address: '1 Main Street',
      username: 'arilee',
      password: 'secret',
    };
    const staff = {
      firstName: 'Sam',
      lastName: 'Taylor',
      email: 'sam@example.test',
      phoneNo: '555-0101',
      licenseNo: 'LIC-1',
      username: 'samt',
      password: 'secret',
      role: 'PHARMACIST' as const,
    };

    auth.registerCustomer(customer).subscribe();
    auth.registerStaff(staff).subscribe();

    const customerRequest = http.expectOne('http://localhost:8080/auth/register/customer');
    const staffRequest = http.expectOne('http://localhost:8080/auth/register/staff');
    expect(customerRequest.request.body).toEqual(customer);
    expect(staffRequest.request.body).toEqual(staff);
    customerRequest.flush(null);
    staffRequest.flush(null);
  });

  it('clears the stored session on logout', () => {
    localStorage.setItem('medorder.user', JSON.stringify({
      userId: 9,
      username: 'manager',
      role: 'PHARMACY_MANAGER',
    }));

    const freshAuth = new AuthService(TestBed.inject(ApiService));
    expect(freshAuth.currentUser?.role).toBe('PHARMACY_MANAGER');

    freshAuth.logout();

    expect(freshAuth.currentUser).toBeNull();
    expect(localStorage.getItem('medorder.user')).toBeNull();
  });
});
