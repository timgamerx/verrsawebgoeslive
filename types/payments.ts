// Payment Types for Centralized Payments Table

export type PaymentType =
  | "subscription"
  | "promoted_post"
  | "boost"
  | "tip"
  | "other";
export type PaymentMethod =
  | "paystack"
  | "flutterwave"
  | "stripe"
  | "balance"
  | "apple_iap"
  | "google_iap"
  | "card"
  | "other";
export type PaymentStatus =
  | "pending"
  | "successful"
  | "failed"
  | "refunded"
  | "cancelled";

export interface Payment {
  id: string;

  // User Information
  user_id: string;
  user_email: string;

  // Payment Type
  payment_type: PaymentType;

  // Amount Information
  amount: number;
  currency: string;
  original_amount?: number;
  original_currency?: string;
  exchange_rate?: number;

  // Payment Provider Information
  payment_method: PaymentMethod;
  payment_reference: string;
  provider_reference?: string;
  provider_transaction_id?: string;

  // Payment Status
  status: PaymentStatus;

  // Related Records
  related_id?: string;
  related_type?: string;

  // Payment Metadata
  metadata?: Record<string, any>;

  // Customer Information
  customer_name?: string;
  customer_phone?: string;

  // Payment Description
  description?: string;

  // Provider Response
  provider_response?: Record<string, any>;

  // Timestamps
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentData {
  user_id: string;
  user_email: string;
  payment_type: PaymentType;
  amount: number;
  currency: string;
  original_amount?: number;
  original_currency?: string;
  exchange_rate?: number;
  payment_method: PaymentMethod;
  payment_reference: string;
  provider_reference?: string;
  provider_transaction_id?: string;
  status?: PaymentStatus;
  related_id?: string;
  related_type?: string;
  metadata?: Record<string, any>;
  customer_name?: string;
  customer_phone?: string;
  description?: string;
  provider_response?: Record<string, any>;
}

export interface UpdatePaymentData {
  status?: PaymentStatus;
  provider_reference?: string;
  provider_transaction_id?: string;
  provider_response?: Record<string, any>;
  paid_at?: string;
  metadata?: Record<string, any>;
}

export interface SubscriptionPurchase {
  id: string;
  user_id: string;
  product_id: string;
  order_id: string;
  purchase_token?: string;
  purchase_time: number;
  plan_type: string;
  billing_cycle: string;
  platform: string;
  status: string;
  expires_at: string;
  metadata?: Record<string, any>;
  created_at?: string;
}
