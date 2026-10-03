import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ResourceManagerComponent } from './features/resource-manager/resource-manager.component';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'dashboard' },
	{ path: 'dashboard', component: DashboardComponent, title: 'Overview | MedOrder' },
	{ path: 'orders', component: ResourceManagerComponent, data: { key: 'orders' }, title: 'Orders | MedOrder' },
	{ path: 'order-items', component: ResourceManagerComponent, data: { key: 'order-items' }, title: 'Order Items | MedOrder' },
	{ path: 'prescriptions', component: ResourceManagerComponent, data: { key: 'prescriptions' }, title: 'Prescriptions | MedOrder' },
	{ path: 'inventory', component: ResourceManagerComponent, data: { key: 'inventory' }, title: 'Inventory | MedOrder' },
	{ path: 'branches', component: ResourceManagerComponent, data: { key: 'branches' }, title: 'Branches | MedOrder' },
	{ path: 'support-requests', component: ResourceManagerComponent, data: { key: 'support-requests' }, title: 'Support Requests | MedOrder' },
	{ path: 'promotions', component: ResourceManagerComponent, data: { key: 'promotions' }, title: 'Promotions | MedOrder' },
	{ path: 'customers', component: ResourceManagerComponent, data: { key: 'customers' }, title: 'Customers | MedOrder' },
	{ path: 'medicines', component: ResourceManagerComponent, data: { key: 'medicines' }, title: 'Medicines | MedOrder' },
	{ path: 'pharmacists', component: ResourceManagerComponent, data: { key: 'pharmacists' }, title: 'Pharmacists | MedOrder' },
	{ path: 'pharmacy-managers', component: ResourceManagerComponent, data: { key: 'pharmacy-managers' }, title: 'Pharmacy Managers | MedOrder' },
	{ path: 'marketing-officers', component: ResourceManagerComponent, data: { key: 'marketing-officers' }, title: 'Marketing Officers | MedOrder' },
	{ path: 'customer-support-officers', component: ResourceManagerComponent, data: { key: 'customer-support-officers' }, title: 'Support Officers | MedOrder' },
	{ path: 'coupons', component: ResourceManagerComponent, data: { key: 'coupons' }, title: 'Coupons | MedOrder' },
	{ path: '**', redirectTo: 'dashboard' },
];
