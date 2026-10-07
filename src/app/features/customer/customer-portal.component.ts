import { CommonModule, formatDate } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, finalize } from 'rxjs';
import { ApiRecord } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { CustomerPortalService, OrderCreatedButUnlinkedError, OrderItemsFailedError } from './customer-portal.service';

type CustomerPage = 'dashboard' | 'medicines' | 'orders' | 'prescriptions' | 'support';

@Component({
  selector: 'app-customer-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './customer-portal.component.html',
  styleUrls: ['./customer-portal.component.css', './customer-portal-records.component.css'],
})
export class CustomerPortalComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly portal = inject(CustomerPortalService);
  private readonly formBuilder = inject(FormBuilder);

  page: CustomerPage = 'dashboard';
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';
  medicines: ApiRecord[] = [];
  orders: ApiRecord[] = [];
  prescriptions: ApiRecord[] = [];
  supportRequests: ApiRecord[] = [];
  medicineSearch = '';
  catalogError = '';
  selectedMedicine: ApiRecord | null = null;
  cart: { medicine: ApiRecord; quantity: number }[] = [];
  showCart = false;
  checkoutError = '';
  checkoutSuccess = '';
  uploadError = '';
  uploadSuccess = '';
  supportError = '';
  supportSuccess = '';
  orderSubmissionBlocked = false;
  addItemsOrder: ApiRecord | null = null;
  addItemsMedicineId: number | null = null;
  addItemsQuantity = 1;
  addItemsError = '';
  addItemsSubmitting = false;

  readonly checkoutForm = this.formBuilder.nonNullable.group({
    deliveryAddress: ['', Validators.required],
  });
  readonly prescriptionForm = this.formBuilder.nonNullable.group({
    prescriptionDate: ['', Validators.required],
    prescriptionFile: ['', Validators.required],
  });
  readonly supportForm = this.formBuilder.nonNullable.group({
    subject: ['', Validators.required],
    description: ['', Validators.required],
  });

  ngOnInit(): void {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data => {
      this.page = data['customerPage'] as CustomerPage;
      this.loadPage();
    });
  }

  get customerId(): number {
    return this.auth.currentUser?.userId ?? 0;
  }

  get customerName(): string {
    return this.auth.currentUser?.username ?? 'Customer';
  }

  get visibleMedicines(): ApiRecord[] {
    const query = this.medicineSearch.trim().toLocaleLowerCase();
    if (!query) return this.medicines;
    return this.medicines.filter(medicine =>
      ['medicineName', 'genericName', 'brandName', 'category', 'strength', 'manufacturer']
        .some(field => String(medicine[field] ?? '').toLocaleLowerCase().includes(query)),
    );
  }

  get cartCount(): number {
    return this.cart.reduce((total, line) => total + line.quantity, 0);
  }

  get cartTotal(): number {
    return this.cart.reduce((total, line) =>
      total + this.price(line.medicine['unitPrice']) * line.quantity, 0,
    );
  }

  get pendingOrderCount(): number {
    return this.orders.filter(order => String(order['orderStatus'] ?? '').toUpperCase() === 'PENDING').length;
  }

  get openSupportCount(): number {
    return this.supportRequests.filter(request => String(request['status'] ?? '').toUpperCase() === 'OPEN').length;
  }

  loadPage(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    const requests = {
      dashboard: () => forkJoin([
        this.portal.orders(this.customerId),
        this.portal.prescriptions(this.customerId),
        this.portal.supportRequests(this.customerId),
      ]).pipe(
        finalize(() => this.loading = false),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe({
        next: ([orders, prescriptions, support]) => {
          this.orders = orders;
          this.prescriptions = prescriptions;
          this.supportRequests = support;
        },
        error: error => this.failLoad(error),
      }),
      medicines: () => this.portal.medicines().pipe(
        finalize(() => this.loading = false),
      ).subscribe({
        next: medicines => {
          this.medicines = medicines;
          this.catalogError = '';
        },
        error: error => {
          this.catalogError = this.errorFor(error);
          this.loading = false;
        },
      }),
      orders: () => this.portal.orders(this.customerId).pipe(
        finalize(() => this.loading = false),
      ).subscribe({
        next: orders => this.orders = orders,
        error: error => this.failLoad(error),
      }),
      prescriptions: () => this.portal.prescriptions(this.customerId).pipe(
        finalize(() => this.loading = false),
      ).subscribe({
        next: prescriptions => this.prescriptions = prescriptions,
        error: error => this.failLoad(error),
      }),
      support: () => this.portal.supportRequests(this.customerId).pipe(
        finalize(() => this.loading = false),
      ).subscribe({
        next: support => this.supportRequests = support,
        error: error => this.failLoad(error),
      }),
    };

    requests[this.page]();
  }

  addToCart(medicine: ApiRecord): void {
    const medicineId = medicine['medicineId'];
    if (typeof medicineId !== 'number') return;
    const line = this.cart.find(item => item.medicine['medicineId'] === medicineId);
    const availableQuantity = Number(medicine['availableQuantity']);
    if (line && line.quantity >= availableQuantity) {
      this.catalogError = 'The cart quantity cannot exceed the current available stock.';
      this.checkoutError = this.catalogError;
      return;
    }
    if (line) line.quantity += 1;
    else this.cart = [...this.cart, { medicine, quantity: 1 }];
    this.catalogError = '';
    this.checkoutError = '';
    this.checkoutSuccess = '';
  }

  updateQuantity(medicineId: number, value: string): void {
    const quantity = Number(value);
    if (!Number.isInteger(quantity) || quantity < 1) return;
    const line = this.cart.find(item => item.medicine['medicineId'] === medicineId);
    if (line && quantity > Number(line.medicine['availableQuantity'])) {
      this.checkoutError = 'The requested quantity exceeds the current available stock.';
      return;
    }
    this.cart = this.cart.map(line =>
      line.medicine['medicineId'] === medicineId ? { ...line, quantity } : line,
    );
    this.checkoutError = '';
  }

  removeFromCart(medicineId: number): void {
    this.cart = this.cart.filter(line => line.medicine['medicineId'] !== medicineId);
  }

  placeOrder(): void {
    if (!this.cart.length || this.checkoutForm.invalid || this.saving || this.orderSubmissionBlocked) {
      this.checkoutForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.checkoutError = '';
    this.checkoutSuccess = '';
    this.portal.placeOrder({
      customerId: this.customerId,
      orderDate: this.localDateTimeNow(),
      orderStatus: 'PENDING',
      totalAmount: this.cartTotal,
      deliveryAddress: this.checkoutForm.controls.deliveryAddress.value.trim(),
    }, this.cart).pipe(
      finalize(() => this.saving = false),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: orderId => {
        this.checkoutSuccess = `Order #${orderId} was placed successfully.`;
        this.cart = [];
        this.checkoutForm.reset();
        this.showCart = false;
        this.loadOrdersAfterCheckout();
      },
      error: error => {
        if (error instanceof OrderItemsFailedError || error instanceof OrderCreatedButUnlinkedError) {
          this.orderSubmissionBlocked = true;
          this.cart = [];
          this.checkoutError = `${error.message} Please contact support and do not submit another order for these items.`;
        } else {
          this.checkoutError = this.errorFor(error);
        }
      },
    });
  }

  uploadPrescription(): void {
    if (this.prescriptionForm.invalid || this.saving) {
      this.prescriptionForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.uploadError = '';
    this.uploadSuccess = '';
    const form = this.prescriptionForm.getRawValue();
    this.portal.createPrescription({
      customerId: this.customerId,
      pharmacistId: null,
      prescriptionDate: form.prescriptionDate,
      prescriptionFile: form.prescriptionFile.trim(),
      status: 'PENDING',
      reviewedDate: null,
      rejectionReason: null,
    }).pipe(
      finalize(() => this.saving = false),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.uploadSuccess = 'Prescription submitted for pharmacist review.';
        this.prescriptionForm.reset();
        this.loadPrescriptionsAfterCreate();
      },
      error: error => this.uploadError = this.errorFor(error),
    });
  }

  createSupportRequest(): void {
    if (this.supportForm.invalid || this.saving) {
      this.supportForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.supportError = '';
    this.supportSuccess = '';
    const form = this.supportForm.getRawValue();
    this.portal.createSupportRequest({
      customerId: this.customerId,
      supportOfficerId: null,
      subject: form.subject.trim(),
      description: form.description.trim(),
      priority: 'NORMAL',
      status: 'OPEN',
    }).pipe(
      finalize(() => this.saving = false),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.supportSuccess = 'Your support request has been submitted.';
        this.supportForm.reset();
        this.loadSupportAfterCreate();
      },
      error: error => this.supportError = this.errorFor(error),
    });
  }

  canCancelOrder(order: ApiRecord): boolean {
    return String(order['orderStatus'] ?? '').toUpperCase() === 'PENDING';
  }

  canAddItemsToOrder(order: ApiRecord): boolean {
    return String(order['orderStatus'] ?? '').toUpperCase() === 'PENDING';
  }

  get addItemsSelectedMedicine(): ApiRecord | null {
    if (this.addItemsMedicineId === null || this.addItemsMedicineId === undefined) {
      return null;
    }
    return this.medicines.find(medicine => Number(medicine['medicineId']) === Number(this.addItemsMedicineId)) ?? null;
  }

  get addItemsSubtotal(): number {
    const medicine = this.addItemsSelectedMedicine;
    if (!medicine) return 0;
    return this.price(medicine['unitPrice']) * Math.max(1, Number(this.addItemsQuantity) || 1);
  }

  openAddItems(order: ApiRecord): void {
    this.addItemsOrder = order;
    this.addItemsMedicineId = null;
    this.addItemsQuantity = 1;
    this.addItemsError = '';
    this.portal.medicines().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: medicines => {
        this.medicines = medicines;
      },
      error: error => {
        this.addItemsError = this.errorFor(error);
      },
    });
  }

  closeAddItems(): void {
    this.addItemsOrder = null;
    this.addItemsMedicineId = null;
    this.addItemsQuantity = 1;
    this.addItemsError = '';
    this.addItemsSubmitting = false;
  }

  submitAddItems(): void {
    if (!this.addItemsOrder || this.addItemsSubmitting) {
      return;
    }
    const medicine = this.addItemsSelectedMedicine;
    const quantity = Number(this.addItemsQuantity);
    if (!medicine || !Number.isFinite(quantity) || quantity <= 0) {
      this.addItemsError = 'Select a medicine and enter a valid quantity.';
      return;
    }

    const orderId = Number(this.addItemsOrder['orderId']);
    if (!Number.isFinite(orderId)) {
      this.addItemsError = 'The selected order is missing a valid identifier.';
      return;
    }

    this.addItemsSubmitting = true;
    this.addItemsError = '';
    this.portal.addOrderItem(orderId, medicine, quantity).pipe(
      finalize(() => this.addItemsSubmitting = false),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.successMessage = 'Order item added successfully.';
        this.closeAddItems();
        this.loadOrdersAfterCheckout();
      },
      error: error => {
        this.addItemsError = this.errorFor(error);
      },
    });
  }

  cancelOrder(order: ApiRecord): void {
    if (!this.canCancelOrder(order)) {
      return;
    }
    const orderId = Number(order['orderId']);
    if (!Number.isFinite(orderId) || !window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.portal.deleteOrder(orderId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.successMessage = 'Order cancelled successfully.';
        this.loadPage();
      },
      error: error => {
        this.errorMessage = this.errorFor(error);
      },
    });
  }

  price(value: unknown): number {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : 0;
  }

  dateLabel(value: unknown, format: 'medium' | 'mediumDate'): string {
    if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) return '—';
    try {
      return formatDate(value, format, 'en-US');
    } catch {
      return '—';
    }
  }

  statusClass(value: unknown): string {
    const status = String(value ?? '').toUpperCase();
    if (['APPROVED', 'RESOLVED', 'COMPLETED', 'DELIVERED'].includes(status)) return 'status-positive';
    if (['PENDING', 'OPEN', 'PROCESSING'].includes(status)) return 'status-pending';
    if (['REJECTED', 'CANCELLED', 'CLOSED'].includes(status)) return 'status-muted';
    return 'status-neutral';
  }

  private loadOrdersAfterCheckout(): void {
    this.portal.orders(this.customerId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: orders => this.orders = orders,
      error: error => this.errorMessage = this.errorFor(error),
    });
  }

  private loadPrescriptionsAfterCreate(): void {
    this.portal.prescriptions(this.customerId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: prescriptions => this.prescriptions = prescriptions,
      error: error => this.uploadError = this.errorFor(error),
    });
  }

  private loadSupportAfterCreate(): void {
    this.portal.supportRequests(this.customerId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: requests => this.supportRequests = requests,
      error: error => this.supportError = this.errorFor(error),
    });
  }

  private failLoad(error: unknown): void {
    this.errorMessage = this.errorFor(error);
    this.loading = false;
  }

  private errorFor(error: unknown): string {
    if (error instanceof HttpErrorResponse) return ApiService.messageFor(error);
    return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
  }

  private localDateTimeNow(): string {
    const date = new Date();
    const part = (value: number, length = 2) => String(value).padStart(length, '0');
    return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}`
      + `T${part(date.getHours())}:${part(date.getMinutes())}:${part(date.getSeconds())}`;
  }
}
