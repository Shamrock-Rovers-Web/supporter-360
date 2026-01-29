/**
 * GoCardless API Types
 * API Documentation: https://developer.gocardless.com/api-reference
 */

/**
 * GoCardless Customer
 */
export interface GCCustomer {
  id: string;
  created_at: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  company_name?: string;
  address_line1?: string;
  address_line2?: string;
  address_line3?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country_code: string;
  language: string;
  metadata: Record<string, string>;
}

/**
 * GoCardless Payment
 */
export interface GCPayment {
  id: string;
  created_at: string;
  charge_date?: string;
  amount: number;
  currency: string;
  amount_refunded: number;
  description?: string;
  status: GCPaymentStatus;
  reference?: string;
  links: GCPaymentLinks;
  metadata: Record<string, string>;
  payout?: string;
}

export type GCPaymentStatus =
  | 'pending_customer_approval'
  | 'pending_submission'
  | 'submitted'
  | 'confirmed'
  | 'paid_out'
  | 'failed'
  | 'charged_back'
  | 'cancelled'
  | 'customer_approval_denied'
  | 'paid_out_late'
  | 'chargeback_cancelled'
  | 'chargeback_lost'
  | 'chargeback_withdrawn';

export interface GCPaymentLinks {
  mandate: string;
  creditor?: string;
  customer?: string;
  payout?: string;
  subscription?: string;
}

/**
 * GoCardless Mandate
 */
export interface GCMandate {
  id: string;
  created_at: string;
  reference?: string;
  status: GCMandateStatus;
  scheme: string;
  next_possible_charge_date: string;
  payments_require_approval: boolean;
  creditor?: string;
  links: GCMandateLinks;
  metadata: Record<string, string>;
}

export type GCMandateStatus =
  | 'pending'
  | 'active'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'submitted';

export interface GCMandateLinks {
  creditor_bank_account: string;
  customer: string;
  customer_bank_account?: string;
  creditor?: string;
}

/**
 * GoCardless Subscription
 */
export interface GCSubscription {
  id: string;
  created_at: string;
  status: GCSubscriptionStatus;
  amount: number;
  currency: string;
  name: string;
  start_date: string;
  end_date?: string;
  interval: number;
  interval_unit: 'weekly' | 'monthly' | 'yearly';
  day_of_month?: number;
  month?: string;
  payment_reference?: string;
  links: GCSubscriptionLinks;
  metadata: Record<string, string>;
  count?: number;
  app_fee?: number;
  upcoming_payments?: GCUpcomingPayment[];
}

export type GCSubscriptionStatus =
  | 'pending_customer_approval'
  | 'customer_approval_denied'
  | 'pending_submission'
  | 'submitted'
  | 'active'
  | 'finished'
  | 'cancelled'
  | 'payment_pending'
  | 'paused'
  | 'paused_customer_approval_denied';

export interface GCSubscriptionLinks {
  mandate: string;
  customer?: string;
  creditor?: string;
}

/**
 * GoCardless Upcoming Payment
 */
export interface GCUpcomingPayment {
  charge_date: string;
  amount: number;
  currency: string;
}

/**
 * GoCardless Customer Bank Account
 */
export interface GCCustomerBankAccount {
  id: string;
  created_at: string;
  account_holder_name?: string;
  account_number_ending: string;
  account_type?: string;
  bank_name?: string;
  country_code: string;
  currency: string;
  enabled: boolean;
  links: GCCustomerBankAccountLinks;
  metadata: Record<string, string>;
}

export interface GCCustomerBankAccountLinks {
  customer: string;
  creditor?: string;
}

/**
 * GoCardless Creditor
 */
export interface GCCreditor {
  id: string;
  created_at: string;
  name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  region?: string;
  postal_code: string;
  country_code: string;
  scheme: string;
}

/**
 * GoCardless Payout
 */
export interface GCPayout {
  id: string;
  created_at: string;
  credited_at?: string;
  amount: number;
  currency: string;
  deduction_amount: number;
  net_amount: number;
  fx?: GCFxDetails;
  links: GCPayoutLinks;
  metadata: Record<string, string>;
  reference?: string;
  tax_amount?: number;
}

export interface GCPayoutLinks {
  creditor: string;
}

export interface GCFxDetails {
  exchange_rate: number;
  fx_amount: number;
  fx_currency: string;
  estimated_exchange_rate: number;
  estimated_fx_amount?: number;
}

/**
 * GoCardless Refund
 */
export interface GCRefund {
  id: string;
  created_at: string;
  amount: number;
  currency: string;
  chargeback_amount?: number;
  deductible_amount?: number;
  links: GCRefundLinks;
  metadata: Record<string, string>;
  reference?: string;
  status: 'pending' | 'successful' | 'failed';
}

export interface GCRefundLinks {
  payment: string;
}

/**
 * GoCardless Webhook Event
 */
export interface GCWebhookEvent {
  id: string;
  created_at: string;
  resource_type: string;
  action: string;
  links: GCWebhookEventLinks;
  details: {
    cause: string;
    description: string;
    origin?: string;
    request_id?: string;
  };
  metadata: Record<string, string>;
}

export interface GCWebhookEventLinks {
  [key: string]: string;
  creditor?: string;
  customer?: string;
  customer_bank_account?: string;
  mandate?: string;
  parent_payment?: string;
  payment?: string;
  payout?: string;
  pref_refund?: string;
  refund?: string;
  subscription?: string;
}

/**
 * GoCardless API List Response
 */
export interface GCListResponse<T> {
  customers?: T[];
  mandates?: T[];
  payments?: T[];
  subscriptions?: T[];
  creditor_bank_accounts?: T[];
  payouts?: T[];
  refunds?: T[];
  creditor?: GCCreditor;
  meta?: GCMeta;
}

export interface GCMeta {
  cursors?: {
    before?: string;
    after?: string;
  };
  limit?: number;
  total?: number;
}

/**
 * GoCardless Error Response
 */
export interface GCError {
  error: {
    message: string;
    errors?: GCErrorDetail[];
    type?: string;
    code?: number;
    request_id?: string;
    documentation_url?: string;
  };
}

export interface GCErrorDetail {
  message: string;
    field?: string;
  }
