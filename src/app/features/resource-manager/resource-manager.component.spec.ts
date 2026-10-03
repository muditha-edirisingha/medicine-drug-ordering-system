import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
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
});