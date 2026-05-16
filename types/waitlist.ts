/**
 * Waitlist Types
 * Type definitions for waitlist-related functionality
 */

export type WaitlistStatus = 'pending' | 'confirmed' | 'unsubscribed';

export interface WaitlistEntry {
  id: string;
  email: string;
  status: WaitlistStatus;
  created_at: string;
  updated_at: string;
  notes?: string | null;
}

export interface WaitlistSubscribeRequest {
  email: string;
}

export interface WaitlistApiResponse<T = any> {
  success?: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface WaitlistSubscribeResponse extends WaitlistApiResponse {
  data?: WaitlistEntry[];
}

export interface WaitlistFormState {
  email: string;
  submitted: boolean;
  loading: boolean;
  error: string;
  successMessage: string;
}
