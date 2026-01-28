/**
 * Future Ticketing API Types
 *
 * API Documentation: https://external.futureticketing.ie/v1/
 * Base URL: https://external.futureticketing.ie/v1/private/
 *
 * Key endpoints:
 * - /account - Customer accounts
 * - /order/search - Order search with multiple filter options
 * - /order/search/date/{start}/{end} - Orders by date range
 * - /order/search/event/{event_id} - Orders by event
 * - /order/search/email/{email} - Orders by email
 * - /product - Products
 * - /event - Events
 * - /entry/scan - Barcode scanning (real-time, not historical)
 */

/**
 * Future Ticketing Account (Customer)
 */
export interface FTAccount {
  id: string;
  external_id: string | null;
  uuid: string;
  email: string;
  title: string | null;
  first_name: string | null;
  second_name: string | null;
  more_info: number;
  more_info2: number;
  added: string;
  archived: number;
}

/**
 * Account with expanded details
 */
export interface FTAccountExpanded extends FTAccount {
  account_category?: FTAccountCategory[];
  address?: FTAccountAddress[];
  company?: FTAccountCompany[];
  extra_field?: FTAccountExtraField[];
  age?: number;
}

export interface FTAccountCategory {
  id: string;
  category_name: string;
}

export interface FTAccountAddress {
  id: string;
  address1: string;
  address2: string;
  address3: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
}

export interface FTAccountCompany {
  id: string;
  company_name: string;
}

export interface FTAccountExtraField {
  id: string;
  extra_field_name: string;
  value: string;
}

/**
 * Future Ticketing Order
 * Based on actual API response from /order/search endpoints
 */
export interface FTOrder {
  id: string;
  original_order_id: string | null;
  order_uuid: string;
  external_code: string | null;
  user_id: string;
  account_uuid: string;
  account_id: string;
  company: string | null;
  company_id: string | null;
  status_id: string;
  status: string;
  order_date: string;
  order_email: string;
  email: string;
  order_amount: string;
  title: string | null;
  first_name: string;
  second_name: string;
  address1: string;
  address2: string;
  address3: string;
  address4: string;
  address5: string;
  address6: string;
  county: string;
  postcode: string;
  country: string;
  phone: string;
  payment_type: string;
  payment_id: string;
  terms_accepted: string;
  more_info: string;
  more_info2: string;
  comment: string | null;
  edited_date: string | null;
  sales_channel_id: string;
  legacy_id: string | null;
  metadata: string | null;
  timezone: string;
  order_timestamp_utc: number;
  detail: FTOrderDetail[];
  extra_field?: FTOrderExtraField[];
}

export interface FTOrderDetail {
  id: string;
  cancelled: string;
  parent_id: string | null;
  product_type: string;
  event_id: string;
  event: string;
  event_date: string;
  product_id: string;
  product_uuid: string;
  product: string;
  product_area_id: string;
  product_area_name: string;
  product_category_id: string;
  product_type_id: string | null;
  product_scan_amount: string;
  quantity: string;
  product_price: string;
  product_vat: string;
  suggested: string;
  send_eticket: string;
  tax_type: string | null;
  tax_value: string | null;
  event_uuid: string;
  event_name_live: string;
  event_date_live: string;
  product_area_colour: string;
  disable_transfer_pwa: string;
  allow_wallet: boolean;
  show_date: boolean;
  redeemed: string;
  barcode?: FTBarcode[];
}

export interface FTBarcode {
  id: string;
  uuid: string;
  barcode_ean13: string;
  barcode_external: string | null;
  scan_datetime: string | null;
  scan_detail: string | null;
  scanner_no: string | null;
  allow_entry: string;
  ticket_valid: string;
  scans_available: string;
  ticket_cancelled: string;
  account_transferred: string | null;
  seat: string | null;
}

export interface FTOrderExtraField {
  order_detail_id: string;
  barcode: string;
  barcode_external: string;
  extra_field_id: string;
  extra_field_name: string;
  value: string;
}

/**
 * Stadium Entry data extracted from order barcode scan info
 * The FT API doesn't have a separate entries endpoint - scan history
 * is embedded in order detail's barcode array
 */
export interface FTStadiumEntry {
  barcode_ean13: string;
  scan_datetime: string | null;
  scan_detail: string | null;
  scanner_no: string | null;
  order_id: string;
  account_id: string;
  event_id: string;
  event: string;
  event_date: string;
  product_id: string;
  product: string;
}

/**
 * Future Ticketing Product
 * Based on actual API response from /product endpoint
 */
export interface FTProduct {
  id: string;
  uuid: string | null;
  internal_id: string | null;
  category_id: string;
  category: string;
  name: string;
  internal_name: string;
  description: string;
  scanner_text: string;
  scanner_colour: string;
  product_price: string;
  vat: string;
  handling_fee: string;
  discount: string;
  min_purchase: string;
  max_purchase: string;
  product_order: string;
  disabled: string;
  product_type_id?: string;
  product_area_id?: string;
}

/**
 * Future Ticketing Event/Match
 * Based on actual API response from /event endpoint
 */
export interface FTEvent {
  id: string;
  internal_id: string | null;
  uuid: string;
  name: string;
  description: string;
  datetime: string;
  event_type_id: string;
  event_category_id: string;
  venue_id: string;
  doors_open: string;
  capacity: string;
  disabled: string;
  on_sale_date: string;
  off_sale_date: string;
  max_per_order: string;
  status?: string;
  event_type_name?: string;
  event_category_name?: string;
  venue_name?: string;
}

/**
 * Future Ticketing API Response wrapper
 * The actual API returns: { data: T[], currentpage: number, limit: string, total: string }
 */
export interface FTApiResponse<T> {
  data: T[];
  currentpage: number | null;
  limit: string | null;
  total: string;
  message?: string;
}

/**
 * Future Ticketing CheckPoint for incremental polling
 */
export interface FTCheckPoint {
  last_account_fetch: string | null;
  last_order_fetch: string | null;
  last_product_fetch: string | null;
  last_event_fetch: string | null;
}

/**
 * Future Ticketing Product Mapping (stored in application database)
 * Maps FT products to meaningful categories for supporter classification
 */
export interface FTProductMapping {
  id: number;
  product_id: string | null;
  category_id: string | null;
  meaning: 'SeasonTicket' | 'AwayTicket' | 'HomeTicket' | 'Membership' | 'Merchandise' | 'Hospitality' | 'Other';
  effective_from: Date;
  effective_to?: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Future Ticketing connection configuration
 */
export interface FTConfig {
  apiUrl: string;
  apiKey: string;
  privateKey?: string;
  apiVersion?: string;
  timeout?: number;
  retryAttempts?: number;
}

/**
 * Error types
 */
export interface FTError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

// Export FTCustomer as alias for FTAccount for backwards compatibility
export type FTCustomer = FTAccount;
