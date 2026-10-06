export const USER_ROLES = [
  'CUSTOMER',
  'ORDER_MANAGER',
  'PHARMACIST',
  'PHARMACY_MANAGER',
  'BRANCH_MANAGER',
  'MARKETING_OFFICER',
  'CUSTOMER_SUPPORT_OFFICER',
] as const;

export type UserRole = typeof USER_ROLES[number];

export interface AuthUser {
  userId: number;
  username: string;
  role: UserRole;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CustomerRegistrationRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNo: string;
  address: string;
  username: string;
  password: string;
}

export interface StaffRegistrationRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNo: string;
  licenseNo: string | null;
  username: string;
  password: string;
  role: Exclude<UserRole, 'CUSTOMER'>;
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && USER_ROLES.some(role => role === value);
}

export function dashboardPathFor(role: UserRole): string {
  switch (role) {
    case 'CUSTOMER':
      return '/customer/dashboard';
    case 'ORDER_MANAGER':
      return '/orders';
    case 'PHARMACIST':
      return '/prescriptions';
    case 'PHARMACY_MANAGER':
      return '/inventory';
    case 'BRANCH_MANAGER':
      return '/branches';
    case 'MARKETING_OFFICER':
      return '/promotions';
    case 'CUSTOMER_SUPPORT_OFFICER':
      return '/support-requests';
  }
}
