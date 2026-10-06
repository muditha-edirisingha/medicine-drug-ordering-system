import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
        validators: field.required ? [Validators.required] : field.kind === 'email' ? [Validators.email] : [],
      });
    }
    this.form = new FormGroup(controls);
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