import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { forkJoin, map } from 'rxjs';
import { CustomerDto, MedicineDto, OrderDto, OrderItemDto } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED'] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];

@Component({
  selector: 'app-order-manager',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-manager.component.html',
  styleUrl: './order-manager.component.css',
})
export class OrderManagerComponent implements OnInit {
  readonly statusOptions: OrderStatus[] = [...ORDER_STATUSES];
  orders: OrderDto[] = [];
  itemsByOrder: Record<number, OrderItemDto[]> = {};
  customers: CustomerDto[] = [];
  medicines: MedicineDto[] = [];
  selectedOrder: OrderDto | null = null;
  pendingStatus: string | null = null;
  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  get selectedOrderItems(): OrderItemDto[] {
    if (!this.selectedOrder?.orderId) {
      return [];
    }
    return this.itemsByOrder[this.selectedOrder.orderId] ?? [];
  }

  selectOrder(order: OrderDto): void {
    this.selectedOrder = order;
    this.pendingStatus = order.orderStatus ?? 'PENDING';
    this.errorMessage = '';
    this.successMessage = '';
  }

  get hasStatusChanges(): boolean {
    return Boolean(this.selectedOrder)
      && this.pendingStatus !== (this.selectedOrder?.orderStatus ?? 'PENDING');
  }

  setPendingStatus(status: string): void {
    this.pendingStatus = status;
    this.errorMessage = '';
    this.successMessage = '';
  }

  getCustomerName(customerId: number | null | undefined): string {
    if (customerId === null || customerId === undefined) {
      return 'Unknown customer';
    }
    const customer = this.customers.find(item => Number(item.customerId) === Number(customerId));
    if (!customer) {
      return `Customer #${customerId}`;
    }
    return `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || `Customer #${customerId}`;
  }

  getMedicineName(medicineId: number | null | undefined): string {
    if (medicineId === null || medicineId === undefined) {
      return 'Unknown medicine';
    }
    const medicine = this.medicines.find(item => Number(item.medicineId) === Number(medicineId));
    return medicine?.medicineName ?? `Medicine #${medicineId}`;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
  }

  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '—';
    }
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      maximumFractionDigits: 2,
    }).format(value);
  }

  saveOrderStatus(): void {
    const orderId = this.selectedOrder?.orderId;
    const nextStatus = this.pendingStatus;
    if (orderId === null || orderId === undefined || !nextStatus || !this.hasStatusChanges || this.saving) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.api.putText('/order/update', { orderId, orderStatus: nextStatus }).subscribe({
      next: () => {
        this.saving = false;
        if (this.selectedOrder?.orderId === orderId) {
          this.selectedOrder.orderStatus = nextStatus as OrderStatus;
        }
        const order = this.orders.find(item => item.orderId === orderId);
        if (order) {
          order.orderStatus = nextStatus as OrderStatus;
        }
        this.pendingStatus = nextStatus;
        this.successMessage = 'Order status updated successfully.';
        this.loadOrders(orderId);
      },
      error: error => {
        this.saving = false;
        this.pendingStatus = this.selectedOrder?.orderStatus ?? 'PENDING';
        this.errorMessage = ApiService.messageFor(error);
      },
    });
  }

  private loadOrders(preferredOrderId?: number): void {
    this.loading = true;
    this.errorMessage = '';
    forkJoin({
      orders: this.api.get<unknown>('/order/get-all-order').pipe(map(value => this.asArray<OrderDto>(value))),
      orderItems: this.api.get<unknown>('/orderItem/get-all-order-items').pipe(map(value => this.asArray<OrderItemDto>(value))),
      customers: this.api.get<unknown>('/customer/get-all').pipe(map(value => this.asArray<CustomerDto>(value))),
      medicines: this.api.get<unknown>('/medicine/get-all-medicine').pipe(map(value => this.asArray<MedicineDto>(value))),
    }).subscribe({
      next: ({ orders, orderItems, customers, medicines }) => {
        this.orders = orders;
        this.customers = customers;
        this.medicines = medicines;
        this.itemsByOrder = {};
        for (const item of orderItems) {
          const orderId = Number(item.orderId);
          if (!Number.isFinite(orderId)) {
            continue;
          }
          if (!this.itemsByOrder[orderId]) {
            this.itemsByOrder[orderId] = [];
          }
          this.itemsByOrder[orderId].push(item);
        }
        this.selectedOrder = this.orders.find(order => order.orderId === preferredOrderId)
          ?? this.orders.find(order => order.orderId === this.selectedOrder?.orderId)
          ?? this.orders[0]
          ?? null;
        this.pendingStatus = this.selectedOrder?.orderStatus ?? 'PENDING';
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        this.errorMessage = ApiService.messageFor(error);
      },
    });
  }

  private asArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? value as T[] : [];
  }
}
