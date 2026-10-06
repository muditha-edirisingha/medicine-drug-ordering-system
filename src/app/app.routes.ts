import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ResourceManagerComponent } from './features/resource-manager/resource-manager.component';
import { authGuard, guestGuard, roleGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login.component';
import { RegisterCustomerComponent } from './features/auth/register-customer.component';
import { RegisterStaffComponent } from './features/auth/register-staff.component';
import { UserRole } from './core/models/auth.models';

const allRoles: UserRole[] = [
	'CUSTOMER',
	'PHARMACIST',
	'PHARMACY_MANAGER',
	'MARKETING_OFFICER',
	'CUSTOMER_SUPPORT_OFFICER',
];

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'login' },
	{ path: 'login', component: LoginComponent, canActivate: [guestGuard], title: 'Sign in | MedOrder' },
	{ path: 'register/customer', component: RegisterCustomerComponent, canActivate: [guestGuard], title: 'Customer registration | MedOrder' },
	{ path: 'register/staff', component: RegisterStaffComponent, canActivate: [guestGuard], title: 'Staff registration | MedOrder' },
	{ path: 'customer/dashboard', loadComponent: () => import('./features/customer/customer-portal.component').then(module => module.CustomerPortalComponent), canActivate: [authGuard, roleGuard], data: { customerPage: 'dashboard', roles: ['CUSTOMER'] }, title: 'My dashboard | MedOrder' },
	{ path: 'customer/medicines', loadComponent: () => import('./features/customer/customer-portal.component').then(module => module.CustomerPortalComponent), canActivate: [authGuard, roleGuard], data: { customerPage: 'medicines', roles: ['CUSTOMER'] }, title: 'Medicines | MedOrder' },
	{ path: 'customer/orders', loadComponent: () => import('./features/customer/customer-portal.component').then(module => module.CustomerPortalComponent), canActivate: [authGuard, roleGuard], data: { customerPage: 'orders', roles: ['CUSTOMER'] }, title: 'My orders | MedOrder' },
	{ path: 'customer/prescriptions', loadComponent: () => import('./features/customer/customer-portal.component').then(module => module.CustomerPortalComponent), canActivate: [authGuard, roleGuard], data: { customerPage: 'prescriptions', roles: ['CUSTOMER'] }, title: 'My prescriptions | MedOrder' },
	{ path: 'customer/support', loadComponent: () => import('./features/customer/customer-portal.component').then(module => module.CustomerPortalComponent), canActivate: [authGuard, roleGuard], data: { customerPage: 'support', roles: ['CUSTOMER'] }, title: 'Support | MedOrder' },
	{ path: 'dashboard', component: DashboardComponent, canActivate: [authGuard, roleGuard], data: { roles: ['PHARMACIST', 'PHARMACY_MANAGER', 'MARKETING_OFFICER', 'CUSTOMER_SUPPORT_OFFICER'] }, title: 'Overview | MedOrder' },
	{ path: 'orders', component: ResourceManagerComponent, canActivate: [authGuard, roleGuard], data: { key: 'orders', roles: ['CUSTOMER'] }, title: 'Orders | MedOrder' },
	{ path: 'order-items', component: ResourceManagerComponent, canActivate: [authGuard, roleGuard], data: { key: 'order-items', roles: ['CUSTOMER'] }, title: 'Order Items | MedOrder' },
	{ path: 'prescriptions', component: ResourceManagerComponent, canActivate: [authGuard, roleGuard], data: { key: 'prescriptions', roles: ['CUSTOMER', 'PHARMACIST'] }, title: 'Prescriptions | MedOrder' },
	{ path: 'inventory', component: ResourceManagerComponent, canActivate: [authGuard, roleGuard], data: { key: 'inventory', roles: ['PHARMACY_MANAGER'] }, title: 'Inventory | MedOrder' },
	{ path: 'branches', component: ResourceManagerComponent, canActivate: [authGuard, roleGuard], data: { key: 'branches', roles: ['PHARMACY_MANAGER'] }, title: 'Branches | MedOrder' },
	{ path: 'support-requests', component: ResourceManagerComponent, canActivate: [authGuard, roleGuard], data: { key: 'support-requests', roles: ['CUSTOMER', 'CUSTOMER_SUPPORT_OFFICER'] }, title: 'Support Requests | MedOrder' },
	{ path: 'promotions', component: ResourceManagerComponent, canActivate: [authGuard, roleGuard], data: { key: 'promotions', roles: ['MARKETING_OFFICER'] }, title: 'Promotions | MedOrder' },
	{ path: 'customers', component: ResourceManagerComponent, canActivate: [authGuard, roleGuard], data: { key: 'customers', roles: ['CUSTOMER_SUPPORT_OFFICER'] }, title: 'Customers | MedOrder' },
	{ path: 'medicines', component: ResourceManagerComponent, canActivate: [authGuard, roleGuard], data: { key: 'medicines', roles: allRoles }, title: 'Medicines | MedOrder' },
	{ path: 'pharmacists', component: ResourceManagerComponent, canActivate: [authGuard, roleGuard], data: { key: 'pharmacists', roles: ['PHARMACY_MANAGER'] }, title: 'Pharmacists | MedOrder' },
	{ path: 'pharmacy-managers', component: ResourceManagerComponent, canActivate: [authGuard, roleGuard], data: { key: 'pharmacy-managers', roles: ['PHARMACY_MANAGER'] }, title: 'Pharmacy Managers | MedOrder' },
	{ path: 'marketing-officers', component: ResourceManagerComponent, canActivate: [authGuard, roleGuard], data: { key: 'marketing-officers', roles: ['PHARMACY_MANAGER'] }, title: 'Marketing Officers | MedOrder' },
	{ path: 'customer-support-officers', component: ResourceManagerComponent, canActivate: [authGuard, roleGuard], data: { key: 'customer-support-officers', roles: ['PHARMACY_MANAGER'] }, title: 'Support Officers | MedOrder' },
	{ path: 'coupons', component: ResourceManagerComponent, canActivate: [authGuard, roleGuard], data: { key: 'coupons', roles: ['MARKETING_OFFICER'] }, title: 'Coupons | MedOrder' },
	{ path: '**', redirectTo: 'login' },
];
