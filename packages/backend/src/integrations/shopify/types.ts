/**
 * Shopify API Types
 * API Documentation: https://shopify.dev/docs/api/admin-rest
 */

/**
 * Shopify Customer object from the Admin API
 */
export interface ShopifyCustomer {
  id: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  accepts_marketing?: boolean;
  created_at: string;
  updated_at: string;
  default_address?: ShopifyAddress;
  addresses?: ShopifyAddress[];
  state: string;
  verified_email?: boolean;
  tax_exempt?: boolean;
  tags?: string;
  last_order_name?: string;
  last_order_id?: number;
  multipass_identifier?: string;
  total_spent: string;
  orders_count: number;
  currency: string;
  note?: string;
}

export interface ShopifyAddress {
  id: number;
  first_name?: string;
  last_name?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  country?: string;
  zip?: string;
  phone?: string;
  name?: string;
  province_code?: string;
  country_code?: string;
  country_name?: string;
  default: boolean;
}

/**
 * Shopify Line Item within an Order
 */
export interface ShopifyLineItem {
  id: number;
  product_id?: number;
  variant_id?: number;
  title: string;
  name: string;
  quantity: number;
  price: string;
  total_discount: string;
  sku?: string;
  variant_title?: string;
  vendor?: string;
  product_exists?: boolean;
  fulfillable_quantity?: number;
  fulfillment_service?: string;
  fulfillment_status?: string;
  gift_card?: boolean;
  taxable?: boolean;
  tax_lines?: ShopifyTaxLine[];
  origin_location?: ShopifyLocation;
  destination_location?: ShopifyLocation;
}

export interface ShopifyTaxLine {
  title: string;
  price: string;
  rate: number;
  price_set: ShopifyMoneySet;
}

export interface ShopifyMoneySet {
  shop_money: ShopifyMoney;
  presentment_money: ShopifyMoney;
}

export interface ShopifyMoney {
  amount: string;
  currency_code: string;
}

export interface ShopifyLocation {
  id: number;
  country_code?: string;
  province_code?: string;
  name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  zip?: string;
}

/**
 * Shopify Order object from the Admin API
 */
export interface ShopifyOrder {
  id: number;
  order_number: number;
  email?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  processed_at?: string;
  currency: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  total_discounts: string;
  total_shipping_price?: string;
  total_weight?: number;
  total_line_items_price: string;
  financial_status: string;
  fulfillment_status?: string;
  tags?: string;
  contact_email?: string;
  name: string;
  cancelled_at?: string;
  cancel_reason?: string;
  cancelled_reason?: string;
  payment_gateway_names?: string[];
  processing_method?: string;
  checkout_token?: string;
  source_name?: string;
  source_identifier?: string;
  source_url?: string;
  reference?: string;
  location_id?: number;
  user_id?: number;
  customer?: ShopifyCustomer;
  line_items: ShopifyLineItem[];
  shipping_address?: ShopifyAddress;
  billing_address?: ShopifyAddress;
  discount_applications?: ShopifyDiscountApplication[];
  discount_codes?: ShopifyDiscountCode[];
  note?: string;
  note_attributes?: ShopifyNoteAttribute[];
  payment_details?: ShopifyPaymentDetails;
}

export interface ShopifyDiscountApplication {
  id: string;
  type: string;
  value: string | number;
  value_type: string;
  allocation_method: string;
  target_selection: string;
  target_type: string;
  title?: string;
  description?: string;
}

export interface ShopifyDiscountCode {
  code: string;
  amount: string;
  type: string;
}

export interface ShopifyNoteAttribute {
  name: string;
  value: string;
}

export interface ShopifyPaymentDetails {
  avs_result_code?: string;
  credit_card_bin?: string;
  credit_card_company?: string;
  credit_card_number?: string;
  cvv_result_code?: string;
}

/**
 * Shopify API Response wrappers
 */
export interface ShopifyListResponse<T> {
  [key: string]: T[];
}

export interface ShopifyError {
  errors: Record<string, string[] | string> | string[];
}

/**
 * Webhook payload types
 */
export interface ShopifyWebhookTopic {
  type: string;
}

export type ShopifyWebhookEventType =
  | 'orders/create'
  | 'orders/updated'
  | 'orders/paid'
  | 'orders/cancelled'
  | 'customers/create'
  | 'customers/update'
  | 'customers/delete'
  | 'app/uninstalled';
