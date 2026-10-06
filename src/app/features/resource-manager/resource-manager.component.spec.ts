import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { RESOURCE_BY_KEY } from '../../core/models/resource.models';
import { ResourceDataService } from '../../core/services/resource-data.service';
import { ResourceManagerComponent } from './resource-manager.component';

describe('ResourceManagerComponent customer passwords', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ResourceManagerComponent>>;
  let data: jasmine.SpyObj<ResourceDataService>;

  const customer = {
    customerId: 42,
    firstName: 'Ari',
    lastName: 'Lee',
    email: 'ari@example.test',
    phoneNo: '555-0100',
    address: '1 Main Street',
    username: 'arilee',
    password: 'existing-secret',
    status: 'active',
  };

  beforeEach(async () => {
    data = jasmine.createSpyObj<ResourceDataService>('ResourceDataService', ['list', 'update', 'create']);
    data.list.and.returnValue(of([]));
    data.update.and.returnValue(of({}));
    data.create.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [ResourceManagerComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { data: of({ key: 'customers' }) } },
        { provide: ResourceDataService, useValue: data },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResourceManagerComponent);
    fixture.detectChanges();
  });

  it('keeps the edit input blank and displays the password guidance', () => {
    const component = fixture.componentInstance;
    component.openEdit(customer);
    fixture.detectChanges();

    expect(component.form.controls['password'].value).toBe('');
    expect(fixture.nativeElement.querySelector('.field-help')?.textContent.trim())
      .toBe('Leave blank to keep the current password.');
  });

  it('preserves the existing password when the edit input is blank', () => {
    const component = fixture.componentInstance;
    component.openEdit(customer);
    component.save();

    expect(data.update).toHaveBeenCalled();
    expect(data.update.calls.mostRecent().args[1]['password']).toBe('existing-secret');
  });

  it('sends a newly entered password', () => {
    const component = fixture.componentInstance;
    component.openEdit(customer);
    component.form.controls['password'].setValue('replacement-secret');
    component.save();

    expect(data.update.calls.mostRecent().args[1]['password']).toBe('replacement-secret');
  });

  it('uses the configured status options for every generic resource', () => {
    const expected: Record<string, string[]> = {
      branches: ['ACTIVE', 'CLOSED'],
      customers: ['ACTIVE', 'INACTIVE'],
      pharmacists: ['ACTIVE', 'INACTIVE'],
      'pharmacy-managers': ['ACTIVE', 'INACTIVE'],
      'branch-managers': ['ACTIVE', 'INACTIVE'],
      'marketing-officers': ['ACTIVE', 'INACTIVE'],
      'customer-support-officers': ['ACTIVE', 'INACTIVE'],
      promotions: ['ACTIVE', 'INACTIVE', 'EXPIRED'],
      coupons: ['ACTIVE', 'INACTIVE', 'EXPIRED'],
      prescriptions: ['PENDING', 'APPROVED', 'REJECTED'],
      'support-requests': ['OPEN', 'IN_PROGRESS', 'RESOLVED'],
    };

    for (const [resourceKey, options] of Object.entries(expected)) {
      const statusField = RESOURCE_BY_KEY.get(resourceKey)?.fields.find(field => field.key === 'status');
      expect(statusField?.kind).withContext(resourceKey).toBe('select');
      expect(statusField?.options).withContext(resourceKey).toEqual(options);
      expect(statusField?.required).withContext(resourceKey).toBeUndefined();
    }

    expect(RESOURCE_BY_KEY.get('orders')?.fields.find(field => field.key === 'orderStatus')?.kind).toBe('text');
  });

  it('shows an existing status selected in the edit dropdown', () => {
    const component = fixture.componentInstance;
    component.openEdit(customer);
    fixture.detectChanges();

    const statusSelect = fixture.nativeElement.querySelector('#field-status') as HTMLSelectElement;
    expect(Array.from(statusSelect.options).map(option => option.textContent?.trim()))
      .toEqual(['Choose status', 'ACTIVE', 'INACTIVE']);
    expect(component.form.controls['status'].value).toBe('ACTIVE');
  });

  it('keeps status optional and submits an empty status as null', () => {
    const component = fixture.componentInstance;
    component.openCreate();
    component.save();

    expect(data.create).toHaveBeenCalled();
    expect(data.create.calls.mostRecent().args[1]['status']).toBeNull();
  });

  it('renders Support Request priority as a fixed select and preserves the existing value', () => {
    const component = fixture.componentInstance;
    const supportResource = RESOURCE_BY_KEY.get('support-requests');
    const priorityField = supportResource?.fields.find(field => field.key === 'priority');
    expect(priorityField?.kind).toBe('select');
    expect(priorityField?.options).toEqual(['LOW', 'NORMAL', 'HIGH']);

    component.resource = supportResource;
    component.openEdit({ supportId: 7, priority: 'HIGH', status: 'OPEN' });
    fixture.detectChanges();

    const prioritySelect = fixture.nativeElement.querySelector('#field-priority') as HTMLSelectElement;
    expect(Array.from(prioritySelect.options).map(option => option.textContent?.trim()))
      .toEqual(['Choose priority', 'LOW', 'NORMAL', 'HIGH']);
    expect(component.form.controls['priority'].value).toBe('HIGH');
  });
});