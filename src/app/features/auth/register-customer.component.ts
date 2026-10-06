import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register-customer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register-customer.component.html',
  styleUrl: './auth.component.css',
})
export class RegisterCustomerComponent {
  private readonly formBuilder = inject(FormBuilder);
  readonly form = this.formBuilder.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phoneNo: ['', Validators.required],
    address: ['', Validators.required],
    username: ['', Validators.required],
    password: ['', Validators.required],
  });
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly auth: AuthService,
  ) {}

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.auth.registerCustomer(this.form.getRawValue()).pipe(
      finalize(() => this.loading = false),
    ).subscribe({
      next: () => {
        this.successMessage = 'Your account has been created. Sign in to continue.';
        this.form.reset();
      },
      error: error => this.errorMessage = this.errorFor(error),
    });
  }

  private errorFor(error: unknown): string {
    return error instanceof HttpErrorResponse
      ? ApiService.messageFor(error)
      : error instanceof Error ? error.message : 'Unable to create your account. Please try again.';
  }
}
