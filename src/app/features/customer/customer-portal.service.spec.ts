import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CustomerPortalService, OrderCreatedButUnlinkedError } from './customer-portal.service';

describe('CustomerPortalService', () => {
  let portal: CustomerPortalService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    portal = TestBed.inject(CustomerPortalService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads medicines through the existing medicine list API', () => {
    let result: unknown;
    portal.medicines().subscribe(medicines => result = medicines);

    const medicineRequest = http.expectOne('http://localhost:8080/medicine/get-all-medicine');
    const inventoryRequest = http.expectOne('http://localhost:8080/inventory/get-all-inventory');
    expect(medicineRequest.request.method).toBe('GET');
    medicineRequest.flush([
      { medicineId: 4, medicineName: 'Example' },
      { medicineId: 5, medicineName: 'Out of stock' },
      { medicineId: 6, medicineName: 'Expired', expiryDate: '2000-01-01' },
    ]);
    inventoryRequest.flush([
      { medicineId: 4, stockQuantity: 5 },
      { medicineId: 4, stockQuantity: 2 },
      { medicineId: 5, stockQuantity: 0 },
      { medicineId: 6, stockQuantity: 5 },
    ]);

    expect(result).toEqual([{ medicineId: 4, medicineName: 'Example', availableQuantity: 7, expired: false }]);
  });

  it('does not guess an order ID when the order search finds multiple new orders', () => {
    let failure: unknown;
    portal.placeOrder({
      customerId: 12,
      orderDate: '2026-10-06T10:00:00',
      orderStatus: 'PENDING',
      totalAmount: 5,
      deliveryAddress: '12 Main Street',
    }, [{ medicine: { medicineId: 7, unitPrice: 5 }, quantity: 1 }]).subscribe({
      error: error => failure = error,
    });

    http.expectOne('http://localhost:8080/order/search-by-customer-id/12')
      .flush([{ orderId: 50 }]);
    http.expectOne('http://localhost:8080/order/add-order').flush(null);
    http.expectOne('http://localhost:8080/order/search-by-customer-id/12')
      .flush([{ orderId: 50 }, { orderId: 51 }, { orderId: 52 }]);

    expect(failure instanceof OrderCreatedButUnlinkedError).toBeTrue();
    http.expectNone('http://localhost:8080/orderItem/add-order-item');
  });

  it('places an order for the supplied customer and creates its items after resolving its ID', () => {
    let placedOrderId: number | undefined;
    const lines = [
      { medicine: { medicineId: 8, unitPrice: 2.5 }, quantity: 2 },
      { medicine: { medicineId: 9, unitPrice: 4 }, quantity: 1 },
    ];
    portal.placeOrder({
      customerId: 42,
      orderDate: '2026-10-06T10:00:00',
      orderStatus: 'PENDING',
      totalAmount: 9,
      deliveryAddress: '42 Main Street',
    }, lines).subscribe(orderId => placedOrderId = orderId);

    const existingOrders = http.expectOne('http://localhost:8080/order/search-by-customer-id/42');
    existingOrders.flush([{ orderId: 20 }]);

    const createOrder = http.expectOne('http://localhost:8080/order/add-order');
    expect(createOrder.request.body).toEqual({
      customerId: 42,
      orderDate: '2026-10-06T10:00:00',
      orderStatus: 'PENDING',
      totalAmount: 9,
      deliveryAddress: '42 Main Street',
    });
    createOrder.flush(null);

    const resolveOrder = http.expectOne('http://localhost:8080/order/search-by-customer-id/42');
    resolveOrder.flush([{ orderId: 20 }, { orderId: 21 }]);

    const firstItem = http.expectOne('http://localhost:8080/orderItem/add-order-item');
    expect(firstItem.request.body).toEqual({
      orderId: 21,
      medicineId: 8,
      quantity: 2,
      unitPrice: 2.5,
      subTotal: 5,
    });
    firstItem.flush(null);

    const secondItem = http.expectOne('http://localhost:8080/orderItem/add-order-item');
    expect(secondItem.request.body).toEqual({
      orderId: 21,
      medicineId: 9,
      quantity: 1,
      unitPrice: 4,
      subTotal: 4,
    });
    secondItem.flush(null);

    expect(placedOrderId).toBe(21);
  });

  it('adds an item to a pending order without creating a new order', () => {
    portal.addOrderItem(21, { medicineId: 8, unitPrice: 2.5 }, 3).subscribe();

    const request = http.expectOne('http://localhost:8080/orderItem/add-order-item');
    expect(request.request.body).toEqual({
      orderId: 21,
      medicineId: 8,
      quantity: 3,
      unitPrice: 2.5,
      subTotal: 7.5,
    });
    request.flush(null);
  });

  it('deletes a pending order through the existing backend endpoint', () => {
    portal.deleteOrder(21).subscribe();

    const request = http.expectOne('http://localhost:8080/order/delete-by-id/21');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it('sends unassigned pending prescriptions and open support requests', () => {
    portal.createPrescription({
      customerId: 13,
      pharmacistId: null,
      prescriptionDate: '2026-10-06',
      prescriptionFile: 'prescription-ref',
      status: 'PENDING',
      reviewedDate: null,
      rejectionReason: null,
    }).subscribe();
    portal.createSupportRequest({
      customerId: 13,
      supportOfficerId: null,
      subject: 'Delivery question',
      description: 'Please help with my delivery.',
      priority: 'NORMAL',
      status: 'OPEN',
    }).subscribe();

    const prescription = http.expectOne('http://localhost:8080/prescription/add');
    const support = http.expectOne('http://localhost:8080/support/add');
    expect(prescription.request.body).toEqual({
      customerId: 13,
      pharmacistId: null,
      prescriptionDate: '2026-10-06',
      prescriptionFile: 'prescription-ref',
      status: 'PENDING',
      reviewedDate: null,
      rejectionReason: null,
    });
    expect(support.request.body).toEqual({
      customerId: 13,
      supportOfficerId: null,
      subject: 'Delivery question',
      description: 'Please help with my delivery.',
      priority: 'NORMAL',
      status: 'OPEN',
    });
    prescription.flush(null);
    support.flush(null);
  });
});
