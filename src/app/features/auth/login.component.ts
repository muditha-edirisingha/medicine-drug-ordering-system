import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { dashboardPathFor } from '../../core/models/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './auth.component.css',
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  readonly form = this.formBuilder.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });
  loading = false;
  errorMessage = '';

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.auth.login(this.form.getRawValue()).pipe(
      finalize(() => this.loading = false),
    ).subscribe({
      next: user => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const destination = returnUrl?.startsWith('/') && !returnUrl.startsWith('//')
          ? returnUrl
          : dashboardPathFor(user.role);
        void this.router.navigateByUrl(destination);
      },
      error: error => this.errorMessage = this.errorFor(error),
    });
  }

  private errorFor(error: unknown): string {
    if (error instanceof HttpErrorResponse) return ApiService.messageFor(error);
    return error instanceof Error ? error.message : 'Unable to sign in. Please try again.';
  }
}
