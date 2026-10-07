import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { OrderManagerComponent } from './order-manager.component';

describe('OrderManagerComponent', () => {
  let order: {
    orderId: number;
    customerId: number;
    orderDate: string;
    orderStatus: string;
    totalAmount: number;
    deliveryAddress: string;
  };
  let api: {
    get: jasmine.Spy;
    putText: jasmine.Spy;
    post: jasmine.Spy;
    delete: jasmine.Spy;
  };

  beforeEach(async () => {
    order = {
      orderId: 2,
      customerId: 3,
      orderDate: '2026-10-06',
      orderStatus: 'PENDING',
      totalAmount: 2500,
      deliveryAddress: 'Colombo',
    };
    api = {
      get: jasmine.createSpy('get').and.callFake((path: string) => of({
        '/order/get-all-order': [order],
        '/orderItem/get-all-order-items': [],
        '/customer/get-all': [],
        '/medicine/get-all-medicine': [],
      }[path])),
      putText: jasmine.createSpy('putText').and.callFake(() => {
        order.orderStatus = 'CONFIRMED';
        return of('updated');
      }),
      post: jasmine.createSpy('post').and.returnValue(of('created')),
      delete: jasmine.createSpy('delete').and.returnValue(of('deleted')),
    };

    await TestBed.configureTestingModule({
      imports: [OrderManagerComponent],
      providers: [{ provide: ApiService, useValue: api }],
    }).compileComponents();
  });

  it('saves a changed status with PUT and refreshes the selected order', () => {
    const fixture = TestBed.createComponent(OrderManagerComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const saveButton = (fixture.nativeElement as HTMLElement).querySelector('.save-status-button') as HTMLButtonElement;

    expect(saveButton.textContent).toContain('Save Status');
    expect(saveButton.disabled).toBeTrue();
    component.setPendingStatus('CONFIRMED');
    expect(component.hasStatusChanges).toBeTrue();
    fixture.detectChanges();
    expect(saveButton.disabled).toBeFalse();
    component.saveOrderStatus();

    expect(api.putText).toHaveBeenCalledWith('/order/update', {
      orderId: 2,
      orderStatus: 'CONFIRMED',
    });
    expect(api.get).toHaveBeenCalledTimes(8);
    expect(component.successMessage).toBe('Order status updated successfully.');
    expect(component.selectedOrder?.orderStatus).toBe('CONFIRMED');
    expect(component.pendingStatus).toBe('CONFIRMED');
  });

  it('restores the previous status and exposes an error when saving fails', () => {
    api.putText.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = TestBed.createComponent(OrderManagerComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.setPendingStatus('CONFIRMED');
    component.saveOrderStatus();

    expect(component.pendingStatus).toBe('PENDING');
    expect(component.errorMessage).toContain('could not complete');
    expect(component.saving).toBeFalse();
  });

  it('deletes a pending order after confirmation and clears the selected order', () => {
    const fixture = TestBed.createComponent(OrderManagerComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const confirmSpy = spyOn(window, 'confirm').and.returnValue(true);

    component.selectOrder(order);
    component.deleteOrder(order);

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to cancel this order?');
    expect(api.delete).toHaveBeenCalledWith('/order/delete-by-id/2');
    expect(component.successMessage).toBe('Order cancelled successfully.');
    expect(component.selectedOrder).toBeNull();
  });
});
