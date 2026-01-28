/**
 * Stripe API Types
 * API Documentation: https://stripe.com/docs/api
 */

/**
 * Stripe Customer object
 */
export interface StripeCustomer {
  id: string;
  object: 'customer';
  email?: string;
  name?: string;
  description?: string;
  phone?: string;
  currency?: string;
  address?: StripeAddress;
  balance?: number;
  created: number;
  default_source?: string | null;
  delinquent?: boolean;
  discount?: null | StripeDiscount;
  invoice_prefix?: string;
  invoice_settings?: StripeInvoiceSettings;
  livemode: boolean;
  metadata: Record<string, string>;
  shipping?: StripeShipping;
  sources?: StripeExternalAccountList;
  subscriptions?: StripeSubscriptionList;
  tax_exempt?: string;
  test_clock?: string | null;
}

export interface StripeAddress {
  city?: string;
  country?: string;
  line1?: string;
  line2?: string;
  postal_code?: string;
  state?: string;
}

export interface StripeDiscount {
  object: string;
  coupon?: StripeCoupon;
  customer?: string;
  end?: number | null;
  start: number;
  subscription?: string;
}

export interface StripeCoupon {
  id: string;
  object: string;
  amount_off?: number | null;
  created: number;
  currency?: string | null;
  duration: string;
  duration_in_months?: number | null;
  livemode: boolean;
  max_redemptions?: number | null;
  metadata: Record<string, string>;
  name?: string | null;
  percent_off?: number | null;
  redeem_by?: number | null;
  times_redeemed: number;
  valid: boolean;
}

export interface StripeInvoiceSettings {
  custom_fields?: StripeCustomField[];
  default_payment_method?: string | null;
  footer?: string | null;
  rendering_options?: Record<string, string> | null;
}

export interface StripeCustomField {
  name: string;
  value: string;
}

export interface StripeShipping {
  address?: StripeAddress;
  name?: string;
  phone?: string;
}

export interface StripeExternalAccountList {
  object: 'list';
  data: StripeExternalAccount[];
  has_more: boolean;
  url: string;
}

export type StripeExternalAccount = StripeBankAccount | StripeCard;

export interface StripeBankAccount {
  id: string;
  object: 'bank_account';
  account_holder_name?: string;
  account_holder_type?: string | null;
  bank_name?: string;
  country: string;
  currency: string;
  customer?: string;
  fingerprint: string;
  last4: string;
  routing_number?: string;
  status: string;
}

export interface StripeCard {
  id: string;
  object: 'card';
  address_city?: string | null;
  address_country?: string | null;
  address_line1?: string | null;
  address_line1_check?: string | null;
  address_line2?: string | null;
  address_state?: string | null;
  address_zip?: string | null;
  address_zip_check?: string | null;
  brand: string;
  country: string;
  customer?: string;
  cvc_check?: string | null;
  dynamic_last4?: string | null;
  exp_month: number;
  exp_year: number;
  fingerprint: string;
  funding: string;
  last4: string;
  name?: string;
  tokenization_method?: string | null;
}

export interface StripeSubscriptionList {
  object: 'list';
  data: StripeSubscription[];
  has_more: boolean;
  url: string;
}

export interface StripeSubscription {
  id: string;
  object: 'subscription';
  application_fee_percent?: number | null;
  automatic_tax?: StripeAutomaticTax;
  billing_cycle_anchor?: number;
  billing_thresholds?: StripeBillingThresholds | null;
  cancel_at?: number | null;
  cancel_at_period_end: boolean;
  cancel_at_period_end_timestamp?: number;
  canceled_at?: number | null;
  collection_method: string;
  created: number;
  current_period_end: number;
  current_period_start: number;
  customer: string;
  days_until_due?: number | null;
  default_payment_method?: string | null;
  default_source?: string | null;
  description?: string | null;
  discount?: StripeDiscount | null;
  ended_at?: number | null;
  items: StripeSubscriptionItemList;
  latest_invoice?: string | null;
  livemode: boolean;
  metadata: Record<string, string>;
  next_pending_invoice_item_invoice?: number | null;
  pause_collection?: StripePauseCollection | null;
  payment_settings: StripeSubscriptionPaymentSettings;
  pending_invoice_item_interval?: StripePendingInvoiceItemInterval | null;
  pending_setup_intent?: string | null;
  pending_update?: StripePendingUpdate | null;
  schedule?: string | null;
  start_date: number;
  status: string;
  test_clock?: string | null;
  transfer_data?: StripeTransferData | null;
  trial_end?: number | null;
  trial_start?: number | null;
}

export interface StripeAutomaticTax {
  enabled: boolean;
  liability?: Record<string, string> | null;
}

export interface StripeBillingThresholds {
  amount_gte?: number;
  reset_billing_cycle_anchor?: boolean;
}

export interface StripeSubscriptionItemList {
  object: 'list';
  data: StripeSubscriptionItem[];
  has_more: boolean;
  url: string;
}

export interface StripeSubscriptionItem {
  id: string;
  object: 'subscription_item';
  billing_thresholds?: StripeBillingThresholds | null;
  created: number;
  metadata: Record<string, string>;
  plan: StripePlan;
  price: StripePrice;
  quantity?: number | null;
  subscription: string;
  tax_rates?: StripeTaxRate[];
}

export interface StripePlan {
  id: string;
  object: 'plan';
  active: boolean;
  amount?: number | null;
  amount_decimal?: string | null;
  billing_scheme: string;
  created: number;
  currency: string;
  interval: string;
  interval_count: number;
  livemode: boolean;
  metadata: Record<string, string>;
  nickname?: string | null;
  product: string;
  tiers?: StripeTier[] | null;
  tiers_mode?: string | null;
  transform_usage?: StripeTransformUsage | null;
  trial_period_days?: number | null;
  usage_type: string;
}

export interface StripeTier {
  amount: number;
  up_to?: number | null;
}

export interface StripeTransformUsage {
  divide_by: number;
  round: string;
}

export interface StripePrice {
  id: string;
  object: 'price';
  active: boolean;
  billing_scheme: string;
  created: number;
  currency: string;
  custom_unit_amount?: number | null;
  livemode: boolean;
  lookup_key?: string | null;
  metadata: Record<string, string>;
  nickname?: string | null;
  product: string;
  recurring?: StripeRecurring | null;
  tax_behavior?: string | null;
  tiers?: StripeTier[] | null;
  tiers_mode?: string | null;
  transform_quantity?: StripeTransformUsage | null;
  type: string;
  unit_amount?: number | null;
  unit_amount_decimal?: string | null;
}

export interface StripeRecurring {
  aggregate_usage?: string | null;
  interval: string;
  interval_count: number;
  trial_period_days?: number | null;
  usage_type?: string;
}

export interface StripeTaxRate {
  id: string;
  object: 'tax_rate';
  active: boolean;
  country?: string | null;
  created: number;
  description?: string | null;
  display_name: string;
  effective_percentage?: number | null;
  inclusive: boolean;
  jurisdiction?: string | null;
  livemode: boolean;
  metadata: Record<string, string>;
  percentage: number;
  state?: string | null;
  tax_type?: string;
}

export interface StripePauseCollection {
  after?: number | null;
  behavior: string;
  cycles?: number | null;
}

export interface StripeSubscriptionPaymentSettings {
  payment_method_types: string[];
  save_default_payment_method: string;
}

export interface StripePendingInvoiceItemInterval {
  interval: string;
  interval_count: number;
}

export interface StripePendingUpdate {
  subscription_items?: StripePendingSubscriptionItem[];
  subscription_proration_date?: number;
}

export interface StripePendingSubscriptionItem {
  id: string;
  metadata?: Record<string, string>;
  plan?: string;
  price?: string;
  quantity?: number;
}

export interface StripeTransferData {
  amount_percent?: number;
  destination: string;
}

/**
 * Stripe Payment Intent
 */
export interface StripePaymentIntent {
  id: string;
  object: 'payment_intent';
  amount: number;
  amount_capturable?: number;
  amount_details?: StripeAmountDetails;
  amount_received?: number;
  application?: string | null;
  application_fee_amount?: number | null;
  automatic_payment_methods?: StripeAutomaticPaymentMethods | null;
  canceled_at?: number | null;
  cancellation_reason?: string | null;
  capture_method: string;
  client_secret?: string;
  confirmation_method: string;
  created: number;
  currency: string;
  customer?: string | null;
  description?: string | null;
  invoice?: string | null;
  last_payment_error?: StripeLastPaymentError | null;
  livemode: boolean;
  metadata: Record<string, string>;
  next_action?: StripeNextAction | null;
  next_source_action?: StripeNextSourceAction | null;
  on_behalf_of?: string | null;
  payment_method?: string | null;
  payment_method_configuration_details?: StripePaymentMethodConfigurationDetails | null;
  payment_method_options?: Record<string, StripePaymentMethodOptions>;
  payment_method_types: string[];
  processing?: StripeProcessing | null;
  receipt_email?: string | null;
  review?: string | null;
  setup_future_usage?: string | null;
  shipping?: StripeShipping | null;
  source?: string | null;
  statement_descriptor?: string | null;
  statement_descriptor_suffix?: string | null;
  status: string;
  transfer_data?: StripeTransferData | null;
  transfer_group?: string | null;
  unusual_processing?: boolean;
}

export interface StripeAmountDetails {
  tip?: StripeTipDetails;
}

export interface StripeTipDetails {
  amount: number;
}

export interface StripeAutomaticPaymentMethods {
  allow_redirects: string;
  enabled: boolean;
}

export interface StripeLastPaymentError {
  charge: string;
  code: string;
  decline_code?: string;
  doc_url?: string;
  message: string;
  param?: string;
  payment_method?: StripePaymentMethod;
  payment_intent?: string;
  source?: StripeExternalAccount;
  type: string;
}

export interface StripePaymentMethod {
  id: string;
  object: 'payment_method';
  au_becs_debit?: StripeAuBecsDebit;
  bacs_debit?: StripeBacsDebit;
  billing_details?: StripeBillingDetails;
  card?: StripeCard;
  card_present?: StripeCardPresent;
  created: number;
  customer?: string | null;
  customer_balance?: StripeCustomerBalance;
  fpx?: StripeFpx;
  ideal?: StripeIdeal;
  interac_present?: StripeInteracPresent;
  livemode: boolean;
  metadata: Record<string, string>;
  sepa_debit?: StripeSepaDebit;
  type: string;
  us_bank_account?: StripeUsBankAccount;
  wechat_pay?: StripeWechatPay;
}

export interface StripeBillingDetails {
  address?: StripeAddress;
  email?: string;
  name?: string;
  phone?: string;
}

export interface StripeAuBecsDebit {
  fingerprint: string;
  last4: string;
}

export interface StripeBacsDebit {
  fingerprint: string;
  last4: string;
}

export interface StripeCardPresent {
  authorization_code?: string;
  brand?: string;
  country?: string;
  description?: string;
  emv_auth_data?: string;
  fingerprint?: string;
  funding?: string;
  last4?: string;
  method?: string;
  read_method?: string;
  terminal?: string;
}

export interface StripeCustomerBalance {
  bank_transfer?: StripeBankTransfer;
}

export interface StripeBankTransfer {
  type?: string;
}

export interface StripeFpx {
  bank?: string;
  account_holder_type?: string;
}

export interface StripeIdeal {
  bank?: string;
  bic?: string;
}

export interface StripeInteracPresent {
}

export interface StripeSepaDebit {
  bank_code: string;
  country: string;
  fingerprint: string;
  last4: string;
}

export interface StripeUsBankAccount {
  account_holder_type: string;
  bank_name: string;
  country: string;
  fingerprint: string;
  last4: string;
  primary_account_number?: string;
  routing_number: string;
}

export interface StripeWechatPay {
}

export interface StripeNextAction {
  redirect_to_url?: StripeRedirectToUrl;
  type: string;
  use_stripe_sdk?: StripeUseStripeSdk;
  verify_with_microdeposits?: StripeVerifyWithMicrodeposits;
}

export interface StripeRedirectToUrl {
  return_url: string;
  url: string;
}

export interface StripeUseStripeSdk {
  merchant_domain?: string;
  type: string;
}

export interface StripeVerifyWithMicrodeposits {
  arrival_date?: number;
  type: string;
}

export interface StripeNextSourceAction {
  type: string;
  authorize_with_url?: StripeAuthorizeWithUrl;
}

export interface StripeAuthorizeWithUrl {
  url: string;
  return_url?: string;
}

export interface StripePaymentMethodConfigurationDetails {
  id: string;
  object: string;
}

export interface StripePaymentMethodOptions {
  card?: StripeCardPaymentMethodOptions;
  link?: StripeLinkPaymentMethodOptions;
  us_bank_account?: StripeUsBankAccountPaymentMethodOptions;
}

export interface StripeCardPaymentMethodOptions {
  installments?: StripeInstallments;
  mandate_options?: StripeMandateOptions;
  network?: string;
  request_three_d_secure: string;
}

export interface StripeInstallments {
  enabled?: boolean;
  plan?: StripeInstallmentPlan;
}

export interface StripeInstallmentPlan {
  count: number;
  interval: string;
  type: string;
}

export interface StripeMandateOptions {
  description?: string;
  amount?: number;
  interval: string;
  payment_method_types?: string[];
  reference?: string;
}

export interface StripeLinkPaymentMethodOptions {
}

export interface StripeUsBankAccountPaymentMethodOptions {
  financial_connections?: StripeFinancialConnections;
  setup_future_usage?: string;
  verification_method: string;
}

export interface StripeFinancialConnections {
  permissions?: string[];
  return_url?: string;
}

export interface StripeProcessing {
  amount?: number;
}

/**
 * Stripe Charge
 */
export interface StripeCharge {
  id: string;
  object: 'charge';
  amount: number;
  amount_captured?: number;
  amount_refunded?: number;
  application?: string | null;
  application_fee?: string | null;
  application_fee_amount?: number | null;
  balance_transaction?: string | null;
  billing_details?: StripeBillingDetails;
  calculated_statement_descriptor?: string;
  captured?: boolean;
  created: number;
  currency: string;
  customer?: string | null;
  description?: string | null;
  destination?: string | null;
  dispute?: string | null;
  disputed?: boolean;
  failure_balance_transaction?: string | null;
  failure_code?: string | null;
  failure_message?: string | null;
  fraud_details?: StripeFraudDetails;
  invoice?: string | null;
  livemode: boolean;
  metadata: Record<string, string>;
  on_behalf_of?: string | null;
  order?: string | null;
  outcome?: StripeOutcome;
  paid?: boolean;
  payment_intent?: string | null;
  payment_method?: string | null;
  payment_method_details?: StripePaymentMethodDetails;
  radar_options?: StripeRadarOptions;
  receipt_email?: string | null;
  receipt_number?: string | null;
  receipt_url?: string | null;
  refunded?: boolean;
  review?: string | null;
  shipping?: StripeShipping | null;
  source?: StripeExternalAccount;
  source_transfer?: string | null;
  statement_descriptor?: string | null;
  statement_descriptor_suffix?: string | null;
  status: string;
  transfer_data?: StripeTransferData | null;
  transfer_group?: string | null;
  ui_details?: StripeUiDetails;
}

export interface StripeFraudDetails {
  user_report?: string | null;
  stripe_report?: string | null;
}

export interface StripeOutcome {
  network_status?: string;
  reason?: string | null;
  risk_level?: string;
  risk_score?: number;
  seller_message?: string;
  type?: string;
}

export interface StripePaymentMethodDetails {
  card?: StripeCardPaymentMethodDetails;
  us_bank_account?: StripeUsBankAccountPaymentMethodDetails;
  type: string;
}

export interface StripeCardPaymentMethodDetails {
  amount?: number;
  brand?: string;
  checks?: StripeCardChecks;
  country?: string;
  exp_month?: number;
  exp_year?: number;
  fingerprint?: string;
  funding?: string;
  installments?: StripeInstallments;
  last4?: string;
  mandate?: string;
  network?: string;
  three_d_secure?: StripeThreeDSecure;
  wallet?: StripeWallet;
}

export interface StripeCardChecks {
  address_line1_check?: string | null;
  address_postal_code_check?: string | null;
  cvc_check?: string | null;
}

export interface StripeThreeDSecure {
  authenticated?: boolean;
  authentication_flow?: string;
  exemption?: string;
  result?: string;
  version?: string;
}

export interface StripeWallet {
  amex_express_checkout?: Record<string, unknown>;
  apple_pay?: Record<string, unknown>;
  google_pay?: Record<string, unknown>;
  masterpass?: Record<string, unknown>;
  samsung_pay?: Record<string, unknown>;
  type?: string;
}

export interface StripeUsBankAccountPaymentMethodDetails {
  account_holder_type?: string;
  bank_name?: string;
  country?: string;
  fingerprint?: string;
  last4?: string;
  mandate?: string;
  routing_number?: string;
}

export interface StripeRadarOptions {
  session?: string;
}

export interface StripeUiDetails {
  card?: StripeCardUiDetails;
}

export interface StripeCardUiDetails {
  three_d_secure?: string;
}

/**
 * Stripe Event (webhook)
 */
export interface StripeEvent {
  id: string;
  object: 'event';
  account?: string;
  api_version?: string;
  created: number;
  data: {
    object: Record<string, unknown>;
    previous_attributes?: Record<string, unknown>;
  };
  livemode: boolean;
  pending_webhooks: number;
  request?: {
    id?: string;
    idempotency_key?: string;
  };
  type: string;
}

/**
 * Stripe API List Response
 */
export interface StripeListResponse<T> {
  object: 'list';
  data: T[];
  has_more: boolean;
  url: string;
}

/**
 * Stripe Error
 */
export interface StripeError {
  error: {
    type: string;
    message: string;
    param?: string;
    code?: string;
  };
}
