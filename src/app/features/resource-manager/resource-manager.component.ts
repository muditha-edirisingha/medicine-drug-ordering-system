import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ApiRecord } from '../../core/models/api.models';
import { ResourceDefinition, ResourceField, RESOURCE_BY_KEY, recordLabel } from '../../core/models/resource.models';
import { ApiService } from '../../core/services/api.service';
import { ResourceDataService } from '../../core/services/resource-data.service';

@Component({
  selector: 'app-resource-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './resource-manager.component.html',
  styleUrl: './resource-manager.component.css',
})
export class ResourceManagerComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  resource?: ResourceDefinition;
  records: ApiRecord[] = [];
  filteredRecords: ApiRecord[] = [];
  relationRecords: Record<string, ApiRecord[]> = {};
  relationErrors: Record<string, string> = {};
  loading = true;
  saving = false;
  deleting = false;
  errorMessage = '';
  successMessage = '';
  searchText = '';
  searchIndex = -1;
  page = 0;
  pageSize = 10;
  showForm = false;
  showDeleteConfirm = false;
  editingRecord: ApiRecord | null = null;
  pendingDelete: ApiRecord | null = null;
  formError = '';
  form = new FormGroup<Record<string, FormControl<unknown>>>({});

  constructor(
    private readonly route: ActivatedRoute,
    private readonly data: ResourceDataService,
  ) {}

  ngOnInit(): void {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(routeData => {
      const resource = RESOURCE_BY_KEY.get(String(routeData['key'] ?? ''));
      this.resource = resource;
      this.closeDialog();
      if (resource) {
        this.searchText = '';
        this.searchIndex = -1;
        this.page = 0;
        this.loadRecords();
      }
    });
  }

  get visibleRows(): ApiRecord[] {
    const start = this.page * this.pageSize;
    return this.filteredRecords.slice(start, start + this.pageSize);
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.filteredRecords.length / this.pageSize));
  }

  get firstShown(): number {
    return this.filteredRecords.length ? this.page * this.pageSize + 1 : 0;
  }

  get lastShown(): number {
    return Math.min((this.page + 1) * this.pageSize, this.filteredRecords.length);
  }

  get hasRelationErrors(): boolean {
    return Object.keys(this.relationErrors).length > 0;
  }

  recordLabel(record: ApiRecord, fields: string[]): string {
    return recordLabel(record, fields);
  }

  loadRecords(): void {
    if (!this.resource) return;
    this.loading = true;
    this.errorMessage = '';
    this.data.list(this.resource.key).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: records => {
        this.records = records;
        this.applyLocalSearch();
        this.loading = false;
        this.loadRelationRecords();
      },
      error: error => {
        this.records = [];
        this.filteredRecords = [];
        this.errorMessage = ApiService.messageFor(error);
        this.loading = false;
      },
    });
  }

  runSearch(): void {
    if (!this.resource) return;
    const query = this.searchText.trim();
    if (!query) {
      this.filteredRecords = [...this.records];
      this.page = 0;
      return;
    }

    const route = this.resource.searchRoutes[this.searchIndex];
    if (!route) {
      this.applyLocalSearch();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.data.search(this.resource, route, query).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: records => {
        this.filteredRecords = records;
        this.page = 0;
        this.loading = false;
      },
      error: error => {
        this.filteredRecords = [];
        this.errorMessage = ApiService.messageFor(error);
        this.loading = false;
      },
    });
  }

  clearSearch(): void {
    this.searchText = '';
    this.searchIndex = -1;
    this.filteredRecords = [...this.records];
    this.errorMessage = '';
    this.page = 0;
  }

  setSearchIndex(value: string): void {
    this.searchIndex = Number(value);
    if (this.searchText.trim()) this.runSearch();
  }

  openCreate(): void {
    this.editingRecord = null;
    this.formError = '';
    this.createForm();
    this.showForm = true;
    this.loadRelationRecords();
  }

  openEdit(record: ApiRecord): void {
    this.editingRecord = record;
    this.formError = '';
    this.createForm(record);
    this.showForm = true;
    this.loadRelationRecords();
  }

  closeDialog(): void {
    this.showForm = false;
    this.showDeleteConfirm = false;
    this.pendingDelete = null;
    this.editingRecord = null;
    this.formError = '';
  }

  save(): void {
    if (!this.resource || this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: ApiRecord = {};
    for (const field of this.resource.fields) {
      let value = this.form.controls[field.key]?.value;
      if (typeof value === 'string') {
        value = value.trim();
      }
      if (field.kind === 'password' && value === '' && this.editingRecord && this.resource.includePasswordWhenBlank) {
        value = this.editingRecord[field.key] ?? null;
      } else if (value === '') {
        value = null;
      }
      if (field.kind === 'number' && value !== null && value !== undefined) value = Number(value);
      if (field.kind === 'relation' && value !== null && value !== undefined) value = Number(value);
      payload[field.key] = value ?? null;
    }
    if (this.editingRecord) payload[this.resource.idField] = this.editingRecord[this.resource.idField];

    this.saving = true;
    this.formError = '';
    const request = this.editingRecord
      ? this.data.update(this.resource, payload)
      : this.data.create(this.resource, payload);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        const action = this.editingRecord ? 'updated' : 'created';
        const title = this.resource?.singular ?? 'Record';
        this.saving = false;
        this.closeDialog();
        this.successMessage = `${title} ${action}.`;
        this.loadRecords();
        this.clearSuccessSoon();
      },
      error: error => {
        this.saving = false;
        this.formError = ApiService.messageFor(error);
      },
    });
  }

  askDelete(record: ApiRecord): void {
    this.pendingDelete = record;
    this.showDeleteConfirm = true;
  }

  confirmDelete(): void {
    if (!this.resource || !this.pendingDelete || this.deleting) return;
    const id = this.pendingDelete[this.resource.idField];
    if (typeof id !== 'string' && typeof id !== 'number') {
      this.errorMessage = 'This record does not contain the ID needed for deletion.';
      this.showDeleteConfirm = false;
      return;
    }

    this.deleting = true;
    this.data.delete(this.resource, id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        const title = this.resource?.singular ?? 'Record';
        this.deleting = false;
        this.showDeleteConfirm = false;
        this.pendingDelete = null;
        this.successMessage = `${title} deleted.`;
        this.loadRecords();
        this.clearSuccessSoon();
      },
      error: error => {
        this.deleting = false;
        this.showDeleteConfirm = false;
        this.errorMessage = ApiService.messageFor(error);
      },
    });
  }

  showLowStock(): void {
    if (!this.resource?.lowStockPath) return;
    this.loading = true;
    this.errorMessage = '';
    this.data.lowStock(this.resource).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: records => {
        this.filteredRecords = records;
        this.searchText = '';
        this.page = 0;
        this.loading = false;
      },
      error: error => {
        this.errorMessage = ApiService.messageFor(error);
        this.loading = false;
      },
    });
  }

  showAllRecords(): void {
    this.clearSearch();
  }

  changePage(offset: number): void {
    this.page = Math.min(Math.max(0, this.page + offset), this.pageCount - 1);
  }

  changePageSize(value: string): void {
    this.pageSize = Number(value);
    this.page = 0;
  }

  fieldValue(record: ApiRecord, field: string): unknown {
    const value = record[field];
    const fieldDefinition = this.resource?.fields.find(item => item.key === field);
    if (fieldDefinition?.relation && value !== null && value !== undefined) {
      const options = this.relationRecords[fieldDefinition.relation.resource] ?? [];
      const match = options.find(option => String(option[fieldDefinition.relation!.valueField]) === String(value));
      return match ? recordLabel(match, fieldDefinition.relation.labelFields) : value;
    }
    return value === null || value === undefined || value === '' ? '—' : value;
  }

  rowTitle(record: ApiRecord): string {
    if (!this.resource) return 'Selected record';
    const id = record[this.resource.idField];
    return `${this.resource.singular} ${id ?? ''}`.trim();
  }

  isStatusColumn(field: string): boolean {
    return field.toLowerCase().includes('status');
  }

  statusClass(value: unknown): string {
    const status = String(value ?? '').toLowerCase();
    if (['active', 'approved', 'resolved', 'completed'].includes(status)) return 'is-positive';
    if (['pending', 'open', 'normal'].includes(status)) return 'is-pending';
    if (['rejected', 'cancelled', 'inactive', 'closed'].includes(status)) return 'is-muted';
    return 'is-neutral';
  }

  private createForm(record: ApiRecord = {}): void {
    if (!this.resource) return;
    const controls: Record<string, FormControl<unknown>> = {};
    for (const field of this.resource.fields) {
      const originalValue = record[field.key];
      const initialValue = field.kind === 'password' ? '' : this.inputValue(field, originalValue);
      controls[field.key] = new FormControl<unknown>(initialValue, {
        validators: this.buildFieldValidators(field),
      });
    }
    this.form = new FormGroup(controls, {
      validators: this.buildResourceValidators(this.resource),
    });
  }

  fieldHasError(fieldKey: string, errorKey?: string): boolean {
    const control = this.form.get(fieldKey);
    if (!control || !control.touched) return false;
    return errorKey ? control.hasError(errorKey) : control.invalid;
  }

  fieldErrorMessage(field: ResourceField): string {
    const control = this.form.get(field.key);
    if (!control || !control.touched) return '';
    if (control.hasError('required')) {
      if (field.kind === 'relation' || field.kind === 'select') return `Select a ${field.label.toLowerCase()}.`;
      return `${field.label} is required.`;
    }
    if (control.hasError('email')) return 'Enter a valid email address.';
    if (control.hasError('pattern')) return field.validationMessage ?? `Enter a valid ${field.label.toLowerCase()}.`;
    if (control.hasError('min')) return `${field.label} must be ${field.min} or more.`;
    if (control.hasError('max')) return `${field.label} must be ${field.max} or less.`;
    if (control.hasError('minlength')) return `${field.label} must be at least ${field.minLength} characters.`;
    if (control.hasError('maxlength')) return `${field.label} must be ${field.maxLength} characters or fewer.`;
    if (control.hasError('positiveNumber')) return field.validationMessage ?? `${field.label} must be greater than 0.`;
    if (control.hasError('nonNegativeNumber')) return field.validationMessage ?? `${field.label} must be 0 or more.`;
    if (control.hasError('futureDate')) return field.validationMessage ?? `${field.label} must be a future date.`;
    return field.validationMessage ?? `Enter a valid ${field.label.toLowerCase()}.`;
  }

  private buildFieldValidators(field: ResourceField): ValidatorFn[] {
    const validators: ValidatorFn[] = [];
    if (field.required) {
      validators.push((control: AbstractControl): ValidationErrors | null => {
        const value = this.normalizedControlValue(control.value);
        return value === null || value === undefined || value === '' ? { required: true } : null;
      });
    }
    if (field.kind === 'email') validators.push(Validators.email);
    if (field.pattern) validators.push(Validators.pattern(field.pattern));
    if (field.minLength != null) validators.push(Validators.minLength(field.minLength));
    if (field.maxLength != null) validators.push(Validators.maxLength(field.maxLength));
    if (field.min != null) validators.push(Validators.min(field.min));
    if (field.max != null) validators.push(Validators.max(field.max));
    if (field.custom === 'positive-number') validators.push(this.positiveNumberValidator());
    if (field.custom === 'non-negative-number') validators.push(this.nonNegativeNumberValidator());
    if (field.custom === 'future-date') validators.push(this.futureDateValidator());
    if (field.custom === 'sri-lankan-phone') validators.push(Validators.pattern(/^0\d{9}$/));
    return validators;
  }

  private buildResourceValidators(resource: ResourceDefinition): ValidatorFn[] {
    const validators: ValidatorFn[] = [];
    switch (resource.key) {
      case 'branches':
        validators.push((group: AbstractControl): ValidationErrors | null => {
          const opening = this.normalizedTimeValue(group.get('openingTime')?.value);
          const closing = this.normalizedTimeValue(group.get('closingTime')?.value);
          if (opening !== null && closing !== null && this.timeToMinutes(closing) < this.timeToMinutes(opening)) {
            return { closingTimeBeforeOpening: true };
          }
          return null;
        });
        break;
      case 'promotions':
        validators.push((group: AbstractControl): ValidationErrors | null => {
          const startDate = this.normalizedDateValue(group.get('startDate')?.value);
          const endDate = this.normalizedDateValue(group.get('endDate')?.value);
          if (startDate && endDate && endDate < startDate) {
            return { endDateBeforeStartDate: true };
          }

          const discountType = this.normalizedControlValue(group.get('discountType')?.value);
          const discountValue = this.coerceNumber(group.get('discountValue')?.value);
          if (discountType === 'PERCENTAGE' && typeof discountValue === 'number' && discountValue > 100) {
            return { percentageDiscountTooHigh: true };
          }
          return null;
        });
        break;
      default:
        break;
    }
    return validators;
  }

  private normalizedControlValue(value: unknown): unknown {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    }
    return value;
  }

  private normalizedDateValue(value: unknown): Date | null {
    if (typeof value !== 'string' || !value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(`${trimmed}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private normalizedTimeValue(value: unknown): string | null {
    if (typeof value !== 'string') return value === null || value === undefined ? null : String(value);
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }

  private timeToMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
  }

  private coerceNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private positiveNumberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = this.coerceNumber(control.value);
      if (value === null || value === undefined || control.value === '' || control.value === null) return null;
      return value > 0 ? null : { positiveNumber: true };
    };
  }

  private nonNegativeNumberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = this.coerceNumber(control.value);
      if (value === null || value === undefined || control.value === '' || control.value === null) return null;
      return value >= 0 ? null : { nonNegativeNumber: true };
    };
  }

  private futureDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = this.normalizedControlValue(control.value);
      if (raw === null || raw === undefined || raw === '') return null;
      const value = this.normalizedDateValue(raw);
      if (!value) return { futureDate: true };
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return value.getTime() > today.getTime() ? null : { futureDate: true };
    };
  }

  private inputValue(field: ResourceField, value: unknown): unknown {
    if (value === null || value === undefined || (field.kind === 'select' && value === '')) {
      return field.kind === 'checkbox' ? false : null;
    }
    if (field.kind === 'select' && typeof value === 'string') {
      return field.options?.find(option => option.toLocaleUpperCase() === value.toLocaleUpperCase()) ?? value;
    }
    if (field.kind === 'datetime-local' && typeof value === 'string') return value.slice(0, 16);
    return value;
  }

  private applyLocalSearch(): void {
    if (!this.resource || !this.searchText.trim()) {
      this.filteredRecords = [...this.records];
      this.page = 0;
      return;
    }
    const query = this.searchText.trim().toLocaleLowerCase();
    this.filteredRecords = this.records.filter(record =>
      this.resource!.localSearchFields.some(field => String(record[field] ?? '').toLocaleLowerCase().includes(query)),
    );
    this.page = 0;
  }

  private loadRelationRecords(): void {
    if (!this.resource) return;
    const relationKeys = [...new Set(this.resource.fields.map(field => field.relation?.resource).filter((key): key is string => Boolean(key)))];
    for (const key of relationKeys) {
      if (this.relationRecords[key]) continue;
      const definition = RESOURCE_BY_KEY.get(key);
      if (!definition) continue;
      this.data.list(key).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: records => {
          this.relationRecords[key] = records;
          delete this.relationErrors[key];
        },
        error: error => {
          this.relationErrors[key] = ApiService.messageFor(error);
        },
      });
    }
  }

  private clearSuccessSoon(): void {
    const message = this.successMessage;
    setTimeout(() => {
      if (this.successMessage === message) this.successMessage = '';
    }, 4500);
  }
}