/**
 * Future Ticketing API Types
 *
 * Note: Future Ticketing may not have a public API.
 * This client is designed to work with potential API endpoints or
 * can be adapted for SFTP file downloads, screen scraping, or direct DB access.
 */

/**
 * Future Ticketing Address
 */
export interface FTAddress {
  AddressLine1?: string;
  AddressLine2?: string;
  City?: string;
  County?: string;
  Postcode?: string;
  Country?: string;
}

/**
 * Future Ticketing Customer
 */
export interface FTCustomer {
  CustomerID: string;
  Email: string;
  FirstName?: string;
  LastName?: string;
  FullName?: string;
  Phone?: string;
  Mobile?: string;
  AddressLine1?: string;
  AddressLine2?: string;
  City?: string;
  County?: string;
  Postcode?: string;
  Country?: string;
  DateOfBirth?: string;
  CreatedDate: string;
  LastModifiedDate?: string;
  MemberNumber?: string;
  SeasonTicketHolder?: boolean;
  LoyaltyPoints?: number;
  CustomFields?: Record<string, unknown>;
}

/**
 * Future Ticketing Order
 */
export interface FTOrder {
  OrderID: string;
  CustomerID: string;
  OrderDate: string;
  OrderNumber?: string;
  TotalAmount: number;
  Currency?: string;
  Status: string;
  PaymentStatus?: string;
  PaymentMethod?: string;
  Items: FTOrderItem[];
  BillingAddress?: FTAddress;
  ShippingAddress?: FTAddress;
  Notes?: string;
  InternalNotes?: string;
  CreatedDate?: string;
  LastModifiedDate?: string;
}

export interface FTOrderItem {
  OrderItemID?: string;
  ProductID: string;
  ProductName: string;
  CategoryID?: string;
  CategoryName?: string;
  Quantity: number;
  Price: number;
  TaxAmount?: number;
  TotalPrice: number;
  DiscountAmount?: number;
  EventID?: string;
  EventName?: string;
  EventDate?: string;
  Seat?: string;
  Row?: string;
  Section?: string;
}

/**
 * Future Ticketing Stadium Entry/Scan
 */
export interface FTStadiumEntry {
  EntryID: string;
  CustomerID: string;
  EventID: string;
  EventName: string;
  EventDate: string;
  EntryTime: string;
  Gate?: string;
  ScannerID?: string;
  TicketType?: string;
  Seat?: string;
  Row?: string;
  Section?: string;
  Barcode?: string;
  SeasonTicket?: boolean;
}

/**
 * Future Ticketing Product
 */
export interface FTProduct {
  ProductID: string;
  ProductName: string;
  CategoryID?: string;
  CategoryName?: string;
  Description?: string;
  Price?: number;
  Currency?: string;
  TaxRate?: number;
  Available?: boolean;
  SeasonTicket?: boolean;
  MembershipType?: string;
  ValidFrom?: string;
  ValidTo?: string;
  EventType?: string;
}

/**
 * Future Ticketing Event/Match
 */
export interface FTEvent {
  EventID: string;
  EventName: string;
  EventDate: string;
  EventType: string;
  Competition?: string;
  HomeTeam?: string;
  AwayTeam?: string;
  Venue?: string;
  Capacity?: number;
  Attendence?: number;
  Status?: string;
}

/**
 * Future Ticketing API Response wrapper
 */
export interface FTApiResponse<T> {
  success?: boolean;
  data?: T[];
  error?: string;
  message?: string;
  pagination?: FTPagination;
}

export interface FTPagination {
  page: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
  hasMore: boolean;
}

/**
 * Future Ticketing CheckPoint for incremental polling
 */
export interface FTCheckPoint {
  last_customer_fetch: string | null;
  last_order_fetch: string | null;
  last_entry_fetch: string | null;
  last_product_fetch: string | null;
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
