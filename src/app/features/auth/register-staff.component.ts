import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { StaffRegistrationRequest, UserRole } from '../../core/models/auth.models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

type StaffRole = Exclude<UserRole, 'CUSTOMER'>;

@Component({
  selector: 'app-register-staff',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register-staff.component.html',
  styleUrl: './auth.component.css',
})
export class RegisterStaffComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  readonly staffRoles: { value: StaffRole; label: string }[] = [
    { value: 'ORDER_MANAGER', label: 'Order manager' },
    { value: 'PHARMACIST', label: 'Pharmacist' },
    { value: 'PHARMACY_MANAGER', label: 'Pharmacy manager' },
    { value: 'BRANCH_MANAGER', label: 'Branch manager' },
    { value: 'MARKETING_OFFICER', label: 'Marketing officer' },
    { value: 'CUSTOMER_SUPPORT_OFFICER', label: 'Customer support officer' },
  ];
  readonly form = this.formBuilder.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phoneNo: ['', Validators.required],
    licenseNo: [''],
    username: ['', Validators.required],
    password: ['', Validators.required],
    role: ['ORDER_MANAGER' as StaffRole, Validators.required],
  });
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly auth: AuthService,
  ) {
    this.updateLicenseValidator(this.form.controls.role.value);
    this.form.controls.role.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(role => this.updateLicenseValidator(role));
  }

  get requiresLicense(): boolean {
    return this.form.controls.role.value === 'PHARMACIST';
  }

  private updateLicenseValidator(role: StaffRole): void {
    const licenseControl = this.form.controls.licenseNo;
    licenseControl.setValidators(role === 'PHARMACIST' ? Validators.required : null);
    licenseControl.updateValueAndValidity({ emitEvent: false });
  }

  submit(): void {
    if (this.form.invalid || (this.requiresLicense && !this.form.controls.licenseNo.value.trim()) || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    const request: StaffRegistrationRequest = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      phoneNo: values.phoneNo.trim(),
      licenseNo: this.requiresLicense ? values.licenseNo.trim() : null,
      username: values.username.trim(),
      password: values.password,
      role: values.role,
    };
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.auth.registerStaff(request).pipe(
      finalize(() => this.loading = false),
    ).subscribe({
      next: () => {
        this.successMessage = 'Staff account created successfully. You can now sign in.';
        this.form.reset({
          firstName: '',
          lastName: '',
          email: '',
          phoneNo: '',
          licenseNo: '',
          username: '',
          password: '',
          role: values.role,
        });
      },
      error: error => this.errorMessage = this.errorFor(error),
    });
  }

  private errorFor(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return error instanceof Error ? error.message : 'Unable to create the staff account. Please try again.';
    }
    if (error.status === 0) return ApiService.messageFor(error);

    const body: unknown = error.error;
    if (typeof body === 'string' && body.trim()) {
      try {
        const parsed: unknown = JSON.parse(body);
        const message = this.messageFromBody(parsed);
        if (message) return message;
      } catch {
        return body.trim();
      }
    }
    const message = this.messageFromBody(body);
    return message ?? ApiService.messageFor(error);
  }

  private messageFromBody(body: unknown): string | null {
    if (!body || typeof body !== 'object') return null;
    const response = body as { message?: unknown; error?: unknown };
    if (typeof response.message === 'string' && response.message.trim()) return response.message;
    if (typeof response.error === 'string' && response.error.trim()) return response.error;
    return null;
  }
}
