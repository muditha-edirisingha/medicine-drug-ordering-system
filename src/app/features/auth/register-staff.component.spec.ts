import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { StaffRegistrationRequest } from '../../core/models/auth.models';
import { RegisterStaffComponent } from './register-staff.component';

describe('RegisterStaffComponent', () => {
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['registerStaff']);
    auth.registerStaff.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [RegisterStaffComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
  });

  function createComponent(): RegisterStaffComponent {
    return TestBed.createComponent(RegisterStaffComponent).componentInstance;
  }

  function fillRequiredFields(
    component: RegisterStaffComponent,
    role: StaffRegistrationRequest['role'],
  ): void {
    component.form.setValue({
      firstName: '  Alex ',
      lastName: ' Morgan  ',
      email: 'alex@example.test',
      phoneNo: ' 555-0102 ',
      licenseNo: role === 'PHARMACIST' ? ' LIC-124 ' : '',
      username: ' alexm ',
      password: 'safe-password',
      role,
    });
  }

  it('does not submit when required fields are empty and keeps validation visible', () => {
    const fixture = TestBed.createComponent(RegisterStaffComponent);
    const component = fixture.componentInstance;

    component.submit();
    fixture.detectChanges();

    expect(auth.registerStaff).not.toHaveBeenCalled();
    expect(component.form.controls.firstName.touched).toBeTrue();
    expect(fixture.nativeElement.querySelector('.auth-field-error')?.textContent).toContain('first name');
  });

  it('requires a pharmacist licence number before submitting', () => {
    const component = createComponent();
    fillRequiredFields(component, 'PHARMACIST');
    component.form.controls.licenseNo.setValue('');

    component.submit();

    expect(auth.registerStaff).not.toHaveBeenCalled();
    expect(component.form.controls.licenseNo.touched).toBeTrue();
  });

  it('does not keep the hidden pharmacist licence control invalid for non-pharmacist roles', () => {
    const component = createComponent();

    fillRequiredFields(component, 'MARKETING_OFFICER');

    expect(component.requiresLicense).toBeFalse();
    expect(component.form.controls.licenseNo.valid).toBeTrue();
    expect(component.form.valid).toBeTrue();
  });

  it('sends exact role values and nullable licence numbers for all four staff roles', () => {
    const component = createComponent();
    const roles: StaffRegistrationRequest['role'][] = [
      'PHARMACIST',
      'PHARMACY_MANAGER',
      'MARKETING_OFFICER',
      'CUSTOMER_SUPPORT_OFFICER',
    ];

    for (const role of roles) {
      fillRequiredFields(component, role);
      component.submit();
    }

    const requests = auth.registerStaff.calls.allArgs().map(args => args[0]);
    expect(requests.map(request => request.role)).toEqual(roles);
    expect(requests.map(request => request.licenseNo)).toEqual(['LIC-124', null, null, null]);
    expect(requests[0]).toEqual({
      firstName: 'Alex',
      lastName: 'Morgan',
      email: 'alex@example.test',
      phoneNo: '555-0102',
      licenseNo: 'LIC-124',
      username: 'alexm',
      password: 'safe-password',
      role: 'PHARMACIST',
    });
  });

  it('shows a success message with sign-in guidance and retains the selected role', () => {
    const fixture = TestBed.createComponent(RegisterStaffComponent);
    const component = fixture.componentInstance;
    fillRequiredFields(component, 'MARKETING_OFFICER');

    component.submit();
    fixture.detectChanges();

    expect(component.successMessage).toContain('Staff account created successfully');
    expect(component.form.controls.role.value).toBe('MARKETING_OFFICER');
    expect(component.form.controls.password.value).toBe('');
    expect(fixture.nativeElement.querySelector('.alert-success')?.textContent).toContain('sign in');
    expect(fixture.nativeElement.querySelector('.alert-success a')?.getAttribute('href')).toBe('/login');
  });

  it('displays the backend registration error instead of hiding it behind a generic message', () => {
    auth.registerStaff.and.returnValue(throwError(() =>
      new HttpErrorResponse({ status: 409, error: { message: 'Username already exists' } }),
    ));
    const component = createComponent();
    fillRequiredFields(component, 'CUSTOMER_SUPPORT_OFFICER');

    component.submit();

    expect(component.errorMessage).toBe('Username already exists');
    expect(component.loading).toBeFalse();
  });
});
