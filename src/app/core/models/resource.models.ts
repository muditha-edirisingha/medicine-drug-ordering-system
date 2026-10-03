import { ApiRecord } from './api.models';

export type FieldKind = 'text' | 'email' | 'password' | 'number' | 'date' | 'datetime-local' | 'time' | 'textarea' | 'checkbox' | 'relation';

export interface RelationshipOption {
  resource: string;
  valueField: string;
  labelFields: string[];
}

export interface ResourceField {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  relation?: RelationshipOption;
  help?: string;
}

export interface SearchRoute {
  label: string;
  path: string;
}

export interface ResourceDefinition {
  key: string;
  title: string;
  singular: string;
  eyebrow: string;
  description: string;
  idField: string;
  listPath: string;
  createPath: string;
  updatePath: string;
  deletePath: (id: string | number) => string;
  stringResponses?: boolean;
  includePasswordWhenBlank?: boolean;
  lowStockPath?: string;
  fields: ResourceField[];
  columns: string[];
  searchRoutes: SearchRoute[];
  localSearchFields: string[];
}

const relation = (
  resource: string,
  valueField: string,
  labelFields: string[],
): RelationshipOption => ({ resource, valueField, labelFields });

const commonStaffSearches = (root: string, idPath: string, idLabel: string): SearchRoute[] => [
  { label: idLabel, path: idPath },
  { label: 'First name', path: `${root}/search-by-first-name` },
  { label: 'Email', path: `${root}/search-by-email` },
  { label: 'Status', path: `${root}/search-by-status` },
];

export const RESOURCES: ResourceDefinition[] = [
  {
    key: 'orders', title: 'Orders', singular: 'Order', eyebrow: 'Fulfilment',
    description: 'Review customer orders and their recorded totals.', idField: 'orderId',
    listPath: '/order/get-all-order', createPath: '/order/add-order', updatePath: '/order/update',
    deletePath: id => `/order/delete-by-id/${encodeURIComponent(id)}`,
    fields: [
      { key: 'customerId', label: 'Customer', kind: 'relation', required: true, relation: relation('customers', 'customerId', ['firstName', 'lastName', 'email']) },
      { key: 'orderDate', label: 'Order date', kind: 'datetime-local' },
      { key: 'orderStatus', label: 'Order status', kind: 'text' },
      { key: 'totalAmount', label: 'Total amount', kind: 'number' },
      { key: 'deliveryAddress', label: 'Delivery address', kind: 'textarea' },
    ],
    columns: ['orderId', 'customerId', 'orderDate', 'orderStatus', 'totalAmount'],
    searchRoutes: [{ label: 'Order ID', path: '/order/search-by-order-id' }],
    localSearchFields: ['orderId', 'customerId', 'orderStatus', 'deliveryAddress'],
  },
  {
    key: 'order-items', title: 'Order Items', singular: 'Order item', eyebrow: 'Fulfilment',
    description: 'Manage the order-item records returned by the backend.', idField: 'orderItemId',
    listPath: '/orderItem/get-all-order-items', createPath: '/orderItem/add-order-item', updatePath: '/orderItem/update-order-item',
    deletePath: id => `/orderItem/delete-order-item/${encodeURIComponent(id)}`,
    fields: [
      { key: 'orderId', label: 'Order', kind: 'relation', required: true, relation: relation('orders', 'orderId', ['orderId', 'customerId']) },
      { key: 'medicineId', label: 'Medicine', kind: 'relation', required: true, relation: relation('medicines', 'medicineId', ['medicineName', 'strength']) },
      { key: 'quantity', label: 'Quantity', kind: 'number' },
      { key: 'unitPrice', label: 'Unit price', kind: 'number' },
      { key: 'subTotal', label: 'Subtotal', kind: 'number' },
    ],
    columns: ['orderItemId', 'orderId', 'medicineId', 'quantity', 'unitPrice', 'subTotal'],
    searchRoutes: [{ label: 'Order item ID', path: '/orderItem/search-by-order-item-id' }],
    localSearchFields: ['orderItemId', 'orderId', 'medicineId'],
  },
  {
    key: 'prescriptions', title: 'Prescriptions', singular: 'Prescription', eyebrow: 'Clinical review',
    description: 'Track prescription submissions and review details.', idField: 'prescriptionId',
    listPath: '/prescription/get-all', createPath: '/prescription/add', updatePath: '/prescription/update',
    deletePath: id => `/prescription/delete/${encodeURIComponent(id)}`,
    fields: [
      { key: 'customerId', label: 'Customer', kind: 'relation', required: true, relation: relation('customers', 'customerId', ['firstName', 'lastName']) },
      { key: 'pharmacistId', label: 'Pharmacist', kind: 'relation', required: true, relation: relation('pharmacists', 'pharmacistId', ['firstName', 'lastName']) },
      { key: 'prescriptionDate', label: 'Prescription date', kind: 'date' },
      { key: 'uploadDate', label: 'Upload date', kind: 'datetime-local' },
      { key: 'prescriptionFile', label: 'Prescription file reference', kind: 'text' },
      { key: 'status', label: 'Status', kind: 'text' },
      { key: 'reviewedDate', label: 'Reviewed date', kind: 'datetime-local' },
      { key: 'rejectionReason', label: 'Rejection reason', kind: 'textarea' },
    ],
    columns: ['prescriptionId', 'customerId', 'pharmacistId', 'prescriptionDate', 'status'],
    searchRoutes: [
      { label: 'Prescription ID', path: '/prescription/search-by-id' },
      { label: 'Customer ID', path: '/prescription/search-by-customer-id' },
      { label: 'Status', path: '/prescription/search-by-status' },
    ],
    localSearchFields: ['prescriptionId', 'customerId', 'pharmacistId', 'status', 'prescriptionFile'],
  },
  {
    key: 'inventory', title: 'Inventory', singular: 'Inventory record', eyebrow: 'Stock control',
    description: 'Monitor on-hand quantities by medicine and branch.', idField: 'inventoryId',
    listPath: '/inventory/get-all-inventory', createPath: '/inventory/add-inventory', updatePath: '/inventory/update-inventory',
    deletePath: id => `/inventory/delete-inventory/${encodeURIComponent(id)}`,
    lowStockPath: '/inventory/get-low-stock',
    fields: [
      { key: 'medicineId', label: 'Medicine', kind: 'relation', required: true, relation: relation('medicines', 'medicineId', ['medicineName', 'strength']) },
      { key: 'branchId', label: 'Branch', kind: 'relation', required: true, relation: relation('branches', 'branchId', ['branchName']) },
      { key: 'stockQuantity', label: 'Stock quantity', kind: 'number' },
      { key: 'reorderLevel', label: 'Reorder level', kind: 'number' },
      { key: 'lastUpdated', label: 'Last updated', kind: 'datetime-local' },
    ],
    columns: ['inventoryId', 'medicineId', 'branchId', 'stockQuantity', 'reorderLevel', 'lastUpdated'],
    searchRoutes: [
      { label: 'Inventory ID', path: '/inventory/search-by-inventory-id' },
      { label: 'Medicine ID', path: '/inventory/search-by-medicine-id' },
      { label: 'Branch ID', path: '/inventory/search-by-branch-id' },
    ],
    localSearchFields: ['inventoryId', 'medicineId', 'branchId'],
  },
  {
    key: 'branches', title: 'Branches', singular: 'Branch', eyebrow: 'Locations',
    description: 'Maintain pharmacy locations and operating details.', idField: 'branchId',
    listPath: '/branch/get-all', createPath: '/branch/add', updatePath: '/branch/update',
    deletePath: id => `/branch/delete/${encodeURIComponent(id)}`,
    fields: [
      { key: 'managerId', label: 'Pharmacy manager', kind: 'relation', required: true, relation: relation('pharmacy-managers', 'managerId', ['firstName', 'lastName']) },
      { key: 'branchName', label: 'Branch name', kind: 'text' },
      { key: 'phoneNo', label: 'Phone number', kind: 'text' },
      { key: 'email', label: 'Email', kind: 'email' },
      { key: 'openingTime', label: 'Opening time', kind: 'time' },
      { key: 'closingTime', label: 'Closing time', kind: 'time' },
      { key: 'status', label: 'Status', kind: 'text' },
      { key: 'address', label: 'Address', kind: 'textarea' },
    ],
    columns: ['branchId', 'branchName', 'managerId', 'phoneNo', 'status'],
    searchRoutes: [
      { label: 'Branch ID', path: '/branch/search-by-id' },
      { label: 'Branch name', path: '/branch/search-by-name' },
    ],
    localSearchFields: ['branchId', 'branchName', 'managerId', 'address'],
  },
  {
    key: 'support-requests', title: 'Support Requests', singular: 'Support request', eyebrow: 'Customer care',
    description: 'Review customer requests, assignments, and resolutions.', idField: 'supportId',
    listPath: '/support/get-all', createPath: '/support/add', updatePath: '/support/update',
    deletePath: id => `/support/delete/${encodeURIComponent(id)}`,
    fields: [
      { key: 'customerId', label: 'Customer', kind: 'relation', required: true, relation: relation('customers', 'customerId', ['firstName', 'lastName']) },
      { key: 'supportOfficerId', label: 'Support officer', kind: 'relation', required: true, relation: relation('customer-support-officers', 'supportOfficerId', ['firstName', 'lastName']) },
      { key: 'subject', label: 'Subject', kind: 'text' },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'requestDate', label: 'Request date', kind: 'datetime-local' },
      { key: 'priority', label: 'Priority', kind: 'text' },
      { key: 'status', label: 'Status', kind: 'text' },
      { key: 'resolution', label: 'Resolution', kind: 'textarea' },
      { key: 'resolvedDate', label: 'Resolved date', kind: 'datetime-local' },
    ],
    columns: ['supportId', 'customerId', 'supportOfficerId', 'subject', 'priority', 'status'],
    searchRoutes: [
      { label: 'Support ID', path: '/support/search-by-id' },
      { label: 'Customer ID', path: '/support/search-by-customer-id' },
      { label: 'Status', path: '/support/search-by-status' },
    ],
    localSearchFields: ['supportId', 'customerId', 'supportOfficerId', 'subject', 'status'],
  },
  {
    key: 'promotions', title: 'Promotions', singular: 'Promotion', eyebrow: 'Marketing',
    description: 'Manage promotion records and their assigned marketing officer.', idField: 'promotionId',
    listPath: '/promotion/get-all', createPath: '/promotion/add', updatePath: '/promotion/update',
    deletePath: id => `/promotion/delete/${encodeURIComponent(id)}`,
    fields: [
      { key: 'promotionName', label: 'Promotion name', kind: 'text' },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'discountType', label: 'Discount type', kind: 'text' },
      { key: 'discountValue', label: 'Discount value', kind: 'number' },
      { key: 'startDate', label: 'Start date', kind: 'date' },
      { key: 'endDate', label: 'End date', kind: 'date' },
      { key: 'status', label: 'Status', kind: 'text' },
      { key: 'marketingOfficerId', label: 'Marketing officer', kind: 'relation', required: true, relation: relation('marketing-officers', 'marketingOfficerId', ['firstName', 'lastName']) },
    ],
    columns: ['promotionId', 'promotionName', 'discountType', 'discountValue', 'startDate', 'endDate', 'status'],
    searchRoutes: [
      { label: 'Promotion ID', path: '/promotion/search-by-id' },
      { label: 'Promotion name', path: '/promotion/search-by-name' },
      { label: 'Status', path: '/promotion/search-by-status' },
    ],
    localSearchFields: ['promotionId', 'promotionName', 'discountType', 'status'],
  },
  {
    key: 'customers', title: 'Customers', singular: 'Customer', eyebrow: 'People',
    description: 'Maintain customer contact and account records.', idField: 'customerId',
    listPath: '/customer/get-all', createPath: '/customer/add', updatePath: '/customer/update',
    deletePath: id => `/customer/delete/${encodeURIComponent(id)}`,
    includePasswordWhenBlank: true,
    fields: [
      { key: 'firstName', label: 'First name', kind: 'text' },
      { key: 'lastName', label: 'Last name', kind: 'text' },
      { key: 'email', label: 'Email', kind: 'email' },
      { key: 'phoneNo', label: 'Phone number', kind: 'text' },
      { key: 'address', label: 'Address', kind: 'textarea' },
      { key: 'username', label: 'Username', kind: 'text' },
      { key: 'password', label: 'Password', kind: 'password', help: 'Leave blank to keep the current password.' },
      { key: 'status', label: 'Status', kind: 'text' },
    ],
    columns: ['customerId', 'firstName', 'lastName', 'email', 'phoneNo', 'status'],
    searchRoutes: [
      { label: 'Customer ID', path: '/customer/search-by-customer-id' },
      { label: 'First name', path: '/customer/search-by-first-name' },
      { label: 'Email', path: '/customer/search-by-email' },
      { label: 'Status', path: '/customer/search-by-status' },
    ],
    localSearchFields: ['customerId', 'firstName', 'lastName', 'email', 'phoneNo'],
  },
  {
    key: 'medicines', title: 'Medicines', singular: 'Medicine', eyebrow: 'Catalogue',
    description: 'Maintain medicine catalogue and prescription flags.', idField: 'medicineId',
    listPath: '/medicine/get-all-medicine', createPath: '/medicine/add-medicine', updatePath: '/medicine/update-medicine',
    deletePath: id => `/medicine/delete-medicine/${encodeURIComponent(id)}`,
    fields: [
      { key: 'medicineName', label: 'Medicine name', kind: 'text' },
      { key: 'genericName', label: 'Generic name', kind: 'text' },
      { key: 'brandName', label: 'Brand name', kind: 'text' },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'category', label: 'Category', kind: 'text' },
      { key: 'strength', label: 'Strength', kind: 'text' },
      { key: 'unitPrice', label: 'Unit price', kind: 'number' },
      { key: 'expiryDate', label: 'Expiry date', kind: 'date' },
      { key: 'manufacturer', label: 'Manufacturer', kind: 'text' },
      { key: 'prescriptionRequired', label: 'Prescription required', kind: 'checkbox' },
    ],
    columns: ['medicineId', 'medicineName', 'genericName', 'strength', 'unitPrice', 'expiryDate', 'prescriptionRequired'],
    searchRoutes: [
      { label: 'Medicine ID', path: '/medicine/search-by-medicine-id' },
      { label: 'Medicine name', path: '/medicine/search-by-medicine-name' },
    ],
    localSearchFields: ['medicineId', 'medicineName', 'genericName', 'brandName', 'category'],
  },
  {
    key: 'pharmacists', title: 'Pharmacists', singular: 'Pharmacist', eyebrow: 'Staff',
    description: 'Maintain pharmacist contact and licence details.', idField: 'pharmacistId',
    listPath: '/pharmacist/get-all', createPath: '/pharmacist/add', updatePath: '/pharmacist/update',
    deletePath: id => `/pharmacist/delete/${encodeURIComponent(id)}`,
    includePasswordWhenBlank: true,
    fields: [
      { key: 'firstName', label: 'First name', kind: 'text' },
      { key: 'lastName', label: 'Last name', kind: 'text' },
      { key: 'email', label: 'Email', kind: 'email' },
      { key: 'phoneNo', label: 'Phone number', kind: 'text' },
      { key: 'licenseNo', label: 'Licence number', kind: 'text' },
      { key: 'username', label: 'Username', kind: 'text' },
      { key: 'password', label: 'Password', kind: 'password', help: 'Password values are not shown in tables.' },
      { key: 'status', label: 'Status', kind: 'text' },
    ],
    columns: ['pharmacistId', 'firstName', 'lastName', 'email', 'licenseNo', 'status'],
    searchRoutes: commonStaffSearches('/pharmacist', '/pharmacist/search-by-pharmacist-id', 'Pharmacist ID'),
    localSearchFields: ['pharmacistId', 'firstName', 'lastName', 'email', 'licenseNo'],
  },
  {
    key: 'pharmacy-managers', title: 'Pharmacy Managers', singular: 'Pharmacy manager', eyebrow: 'Staff',
    description: 'Maintain pharmacy manager contact records.', idField: 'managerId',
    listPath: '/pharmacy-manager/get-all', createPath: '/pharmacy-manager/add', updatePath: '/pharmacy-manager/update',
    deletePath: id => `/pharmacy-manager/delete/${encodeURIComponent(id)}`,
    stringResponses: true, includePasswordWhenBlank: true,
    fields: [
      { key: 'firstName', label: 'First name', kind: 'text' },
      { key: 'lastName', label: 'Last name', kind: 'text' },
      { key: 'email', label: 'Email', kind: 'email' },
      { key: 'phoneNo', label: 'Phone number', kind: 'text' },
      { key: 'username', label: 'Username', kind: 'text' },
      { key: 'password', label: 'Password', kind: 'password', help: 'Password values are not shown in tables.' },
      { key: 'status', label: 'Status', kind: 'text' },
    ],
    columns: ['managerId', 'firstName', 'lastName', 'email', 'phoneNo', 'status'],
    searchRoutes: commonStaffSearches('/pharmacy-manager', '/pharmacy-manager/search-by-manager-id', 'Manager ID'),
    localSearchFields: ['managerId', 'firstName', 'lastName', 'email'],
  },
  {
    key: 'marketing-officers', title: 'Marketing Officers', singular: 'Marketing officer', eyebrow: 'Staff',
    description: 'Maintain marketing officer contact records.', idField: 'marketingOfficerId',
    listPath: '/marketing-officer/get-all', createPath: '/marketing-officer/add', updatePath: '/marketing-officer/update',
    deletePath: id => `/marketing-officer/delete/${encodeURIComponent(id)}`,
    stringResponses: true, includePasswordWhenBlank: true,
    fields: [
      { key: 'firstName', label: 'First name', kind: 'text' },
      { key: 'lastName', label: 'Last name', kind: 'text' },
      { key: 'email', label: 'Email', kind: 'email' },
      { key: 'phoneNo', label: 'Phone number', kind: 'text' },
      { key: 'username', label: 'Username', kind: 'text' },
      { key: 'password', label: 'Password', kind: 'password', help: 'Password values are not shown in tables.' },
      { key: 'status', label: 'Status', kind: 'text' },
    ],
    columns: ['marketingOfficerId', 'firstName', 'lastName', 'email', 'phoneNo', 'status'],
    searchRoutes: commonStaffSearches('/marketing-officer', '/marketing-officer/search-by-marketing-officer-id', 'Officer ID'),
    localSearchFields: ['marketingOfficerId', 'firstName', 'lastName', 'email'],
  },
  {
    key: 'customer-support-officers', title: 'Customer Support Officers', singular: 'Customer support officer', eyebrow: 'Staff',
    description: 'Maintain customer support officer contact records.', idField: 'supportOfficerId',
    listPath: '/customer-support-officer/get-all', createPath: '/customer-support-officer/add', updatePath: '/customer-support-officer/update',
    deletePath: id => `/customer-support-officer/delete/${encodeURIComponent(id)}`,
    stringResponses: true, includePasswordWhenBlank: true,
    fields: [
      { key: 'firstName', label: 'First name', kind: 'text' },
      { key: 'lastName', label: 'Last name', kind: 'text' },
      { key: 'email', label: 'Email', kind: 'email' },
      { key: 'phoneNo', label: 'Phone number', kind: 'text' },
      { key: 'username', label: 'Username', kind: 'text' },
      { key: 'password', label: 'Password', kind: 'password', help: 'Password values are not shown in tables.' },
      { key: 'status', label: 'Status', kind: 'text' },
    ],
    columns: ['supportOfficerId', 'firstName', 'lastName', 'email', 'phoneNo', 'status'],
    searchRoutes: commonStaffSearches('/customer-support-officer', '/customer-support-officer/search-by-support-officer-id', 'Officer ID'),
    localSearchFields: ['supportOfficerId', 'firstName', 'lastName', 'email'],
  },
  {
    key: 'coupons', title: 'Coupons', singular: 'Coupon', eyebrow: 'Marketing',
    description: 'Manage coupon codes associated with a promotion.', idField: 'couponId',
    listPath: '/coupon/get-all', createPath: '/coupon/add', updatePath: '/coupon/update',
    deletePath: id => `/coupon/delete/${encodeURIComponent(id)}`,
    fields: [
      { key: 'promotionId', label: 'Promotion', kind: 'relation', required: true, relation: relation('promotions', 'promotionId', ['promotionName']) },
      { key: 'couponCode', label: 'Coupon code', kind: 'text' },
      { key: 'usageLimit', label: 'Usage limit', kind: 'number' },
      { key: 'usedCount', label: 'Used count', kind: 'number' },
      { key: 'status', label: 'Status', kind: 'text' },
    ],
    columns: ['couponId', 'promotionId', 'couponCode', 'usageLimit', 'usedCount', 'status'],
    searchRoutes: [
      { label: 'Coupon ID', path: '/coupon/search-by-id' },
      { label: 'Promotion ID', path: '/coupon/search-by-promotion-id' },
    ],
    localSearchFields: ['couponId', 'promotionId', 'couponCode', 'status'],
  },
];

export const RESOURCE_BY_KEY = new Map(RESOURCES.map(resource => [resource.key, resource]));

export const RESOURCE_BY_API_PATH = new Map(
  RESOURCES.map(resource => [resource.listPath, resource]),
);

export function recordLabel(record: ApiRecord, fields: string[]): string {
  return fields
    .map(field => record[field])
    .filter(value => value !== null && value !== undefined && value !== '')
    .join(' · ');
}