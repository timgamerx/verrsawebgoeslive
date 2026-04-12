export interface Payment {
  id: string;
  user_id?: string;
  amount: number;
  currency?: string;
  status?: string;
  type?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface SubscriptionPurchase {
  id: string;
  user_id?: string;
  plan?: string;
  amount?: number;
  currency?: string;
  status?: string;
  started_at?: string;
  expires_at?: string;
  created_at?: string;
  [key: string]: any;
}
