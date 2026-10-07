import { Injectable } from '@angular/core';
import { Observable, catchError, concatMap, forkJoin, from, map, switchMap, throwError, toArray } from 'rxjs';
import { ApiRecord } from '../../core/models/api.models';
import { RESOURCE_BY_KEY } from '../../core/models/resource.models';
import { ApiService } from '../../core/services/api.service';
import { ResourceDataService } from '../../core/services/resource-data.service';

export interface CartLine {
  medicine: ApiRecord;
  quantity: number;
}

export interface CustomerOrderRequest {
  customerId: number;
  orderDate: string;
  orderStatus: 'PENDING';
  totalAmount: number;
  deliveryAddress: string;
}

export interface CustomerPrescriptionRequest {
  customerId: number;
  pharmacistId: null;
  prescriptionDate: string;
  prescriptionFile: string;
  status: 'PENDING';
  reviewedDate: null;
  rejectionReason: null;
}

export interface CustomerSupportRequest {
  customerId: number;
  supportOfficerId: null;
  subject: string;
  description: string;
  priority: 'NORMAL';
  status: 'OPEN';
}

export class OrderItemsFailedError extends Error {
  constructor(readonly orderId: number, readonly originalError: unknown) {
    super(`Order ${orderId} was placed, but one or more order items could not be saved.`);
    this.name = 'OrderItemsFailedError';
  }
}

export class OrderCreatedButUnlinkedError extends Error {
  constructor() {
    super('The order was sent, but the backend did not return its ID and the customer order list did not identify exactly one new order. No order items were submitted.');
    this.name = 'OrderCreatedButUnlinkedError';
  }
}

@Injectable({ providedIn: 'root' })
export class CustomerPortalService {
  constructor(
    private readonly api: ApiService,
    private readonly resources: ResourceDataService,
  ) {}

  medicines(): Observable<ApiRecord[]> {
    return forkJoin([
      this.resources.list('medicines'),
      this.resources.list('inventory'),
    ]).pipe(
      map(([medicines, inventory]) => {
        const quantities = new Map<number, number>();
        const today = new Date().toISOString().slice(0, 10);
        for (const record of inventory) {
          const medicineId = Number(record['medicineId']);
          const quantity = Number(record['stockQuantity']);
          if (Number.isFinite(medicineId) && Number.isFinite(quantity)) {
            quantities.set(medicineId, (quantities.get(medicineId) ?? 0) + quantity);
          }
        }
        return medicines
          .map(medicine => {
            const medicineId = Number(medicine['medicineId']);
            return {
              ...medicine,
              availableQuantity: quantities.get(medicineId) ?? 0,
              expired: typeof medicine['expiryDate'] === 'string'
                && /^\d{4}-\d{2}-\d{2}$/.test(medicine['expiryDate'])
                && medicine['expiryDate'] < today,
            };
          })
          .filter(medicine => Number(medicine['availableQuantity']) > 0 && !medicine['expired']);
      }),
    );
  }

  orders(customerId: number): Observable<ApiRecord[]> {
    return this.customerRecords(`/order/search-by-customer-id/${customerId}`);
  }

  prescriptions(customerId: number): Observable<ApiRecord[]> {
    return this.customerRecords(`/prescription/search-by-customer-id/${customerId}`);
  }

  supportRequests(customerId: number): Observable<ApiRecord[]> {
    return this.customerRecords(`/support/search-by-customer-id/${customerId}`);
  }

  placeOrder(
    request: CustomerOrderRequest,
    lines: CartLine[],
  ): Observable<number> {
    const orderResource = RESOURCE_BY_KEY.get('orders');
    const itemResource = RESOURCE_BY_KEY.get('order-items');
    if (!orderResource || !itemResource) {
      return throwError(() => new Error('Order API configuration is unavailable.'));
    }

    return this.orders(request.customerId).pipe(
      switchMap(existingOrders => {
        const existingIds = new Set(existingOrders
          .map(order => order['orderId'])
          .filter((id): id is number => typeof id === 'number'));

        return this.resources.create(orderResource, { ...request }).pipe(
          switchMap(() => this.orders(request.customerId).pipe(
            map(orders => orders.filter(order =>
              typeof order['orderId'] === 'number' && !existingIds.has(order['orderId']),
            )),
            catchError(() => throwError(() => new OrderCreatedButUnlinkedError())),
          )),
          switchMap(newOrders => {
            if (newOrders.length !== 1) return throwError(() => new OrderCreatedButUnlinkedError());

            const orderId = newOrders[0]['orderId'];
            if (typeof orderId !== 'number') {
              return throwError(() => new OrderCreatedButUnlinkedError());
            }

            return from(lines).pipe(
              concatMap(line => {
                const medicineId = line.medicine['medicineId'];
                const unitPrice = Number(line.medicine['unitPrice']);
                if (typeof medicineId !== 'number' || !Number.isFinite(unitPrice)) {
                  return throwError(() => new Error('A cart item is missing its medicine ID or price.'));
                }
                const item: ApiRecord = {
                  orderId,
                  medicineId,
                  quantity: line.quantity,
                  unitPrice,
                  subTotal: unitPrice * line.quantity,
                };
                return this.resources.create(itemResource, item);
              }),
              toArray(),
              map(() => orderId),
              catchError(error => throwError(() => new OrderItemsFailedError(orderId, error))),
            );
          }),
        );
      }),
    );
  }

  deleteOrder(orderId: number): Observable<unknown> {
    return this.api.delete<unknown>(`/order/delete-by-id/${encodeURIComponent(orderId)}`);
  }

  addOrderItem(orderId: number, medicine: ApiRecord, quantity: number): Observable<unknown> {
    const definition = RESOURCE_BY_KEY.get('order-items');
    if (!definition) {
      return throwError(() => new Error('Order item API configuration is unavailable.'));
    }

    const medicineId = Number(medicine['medicineId']);
    const unitPrice = Number(medicine['unitPrice']);
    if (!Number.isFinite(medicineId) || !Number.isFinite(unitPrice) || quantity <= 0) {
      return throwError(() => new Error('Select a valid medicine and quantity before adding it to the order.'));
    }

    return this.resources.create(definition, {
      orderId,
      medicineId,
      quantity,
      unitPrice,
      subTotal: unitPrice * quantity,
    });
  }

  createPrescription(request: CustomerPrescriptionRequest): Observable<unknown> {
    const definition = RESOURCE_BY_KEY.get('prescriptions');
    if (!definition) return throwError(() => new Error('Prescription API configuration is unavailable.'));
    return this.resources.create(definition, { ...request });
  }

  createSupportRequest(request: CustomerSupportRequest): Observable<unknown> {
    const definition = RESOURCE_BY_KEY.get('support-requests');
    if (!definition) return throwError(() => new Error('Support API configuration is unavailable.'));
    return this.resources.create(definition, { ...request });
  }

  private customerRecords(path: string): Observable<ApiRecord[]> {
    return this.api.get<unknown>(path).pipe(
      map(result => {
        if (!Array.isArray(result)) {
          throw new Error('The backend returned an unexpected customer records response.');
        }
        return result.filter((record): record is ApiRecord =>
          typeof record === 'object' && record !== null,
        );
      }),
    );
  }
}
