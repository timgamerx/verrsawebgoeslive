export interface PaymentData {
  amount: number;
  currency: string;
  reference?: string;
  method?: string;
  status?: string;
  [key: string]: any;
}
