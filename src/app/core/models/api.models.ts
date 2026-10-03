export interface BranchDto {
  branchId?: number | null;
  managerId?: number | null;
  branchName?: string | null;
  phoneNo?: string | null;
  email?: string | null;
  openingTime?: string | null;
  closingTime?: string | null;
  status?: string | null;
  address?: string | null;
}

export interface CouponDto {
  couponId?: number | null;
  promotionId?: number | null;
  couponCode?: string | null;
  usageLimit?: number | null;
  usedCount?: number | null;
  status?: string | null;
}

export interface CustomerDto {
  customerId?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneNo?: string | null;
  address?: string | null;
  username?: string | null;
  password?: string | null;
  status?: string | null;
}

export interface CustomerSupportOfficerDto {
  supportOfficerId?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneNo?: string | null;
  username?: string | null;
  password?: string | null;
  status?: string | null;
}

export interface InventoryDto {
  inventoryId?: number | null;
  medicineId?: number | null;
  branchId?: number | null;
  stockQuantity?: number | null;
  reorderLevel?: number | null;
  lastUpdated?: string | null;
}

export interface MarketingOfficerDto {
  marketingOfficerId?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneNo?: string | null;
  username?: string | null;
  password?: string | null;
  status?: string | null;
}

export interface MedicineDto {
  medicineId?: number | null;
  medicineName?: string | null;
  genericName?: string | null;
  brandName?: string | null;
  description?: string | null;
  category?: string | null;
  strength?: string | null;
  unitPrice?: number | null;
  expiryDate?: string | null;
  manufacturer?: string | null;
  prescriptionRequired?: boolean | null;
}

export interface OrderDto {
  orderId?: number | null;
  customerId?: number | null;
  orderDate?: string | null;
  orderStatus?: string | null;
  totalAmount?: number | null;
  deliveryAddress?: string | null;
}

export interface OrderItemDto {
  orderItemId?: number | null;
  orderId?: number | null;
  medicineId?: number | null;
  quantity?: number | null;
  unitPrice?: number | null;
  subTotal?: number | null;
}

export interface PharmacistDto {
  pharmacistId?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneNo?: string | null;
  licenseNo?: string | null;
  username?: string | null;
  password?: string | null;
  status?: string | null;
}

export interface PharmacyManagerDto {
  managerId?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneNo?: string | null;
  username?: string | null;
  password?: string | null;
  status?: string | null;
}

export interface PrescriptionDto {
  prescriptionId?: number | null;
  customerId?: number | null;
  pharmacistId?: number | null;
  prescriptionDate?: string | null;
  uploadDate?: string | null;
  prescriptionFile?: string | null;
  status?: string | null;
  reviewedDate?: string | null;
  rejectionReason?: string | null;
}

export interface PromotionDto {
  promotionId?: number | null;
  promotionName?: string | null;
  description?: string | null;
  discountType?: string | null;
  discountValue?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  marketingOfficerId?: number | null;
}

export interface SupportRequestDto {
  supportId?: number | null;
  customerId?: number | null;
  supportOfficerId?: number | null;
  subject?: string | null;
  description?: string | null;
  requestDate?: string | null;
  priority?: string | null;
  status?: string | null;
  resolution?: string | null;
  resolvedDate?: string | null;
}

export type ApiRecord = Record<string, unknown>;

export interface ApiErrorBody {
  status?: number;
  error?: string;
  message?: string;
  timestamp?: string;
  path?: string;
}