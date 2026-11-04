export interface BillingInformation {
  id: number;
  userId: number | string;
  fullName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
  createdAt: string;
}

export interface BillingInformationInput {
  fullName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface BillingInformationResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}