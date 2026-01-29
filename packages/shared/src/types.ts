/**
 * Shared type definitions for Supporter 360
 *
 * This module contains all TypeScript types used across the backend, frontend,
 * and database layers of the Supporter 360 application.
 *
 * @packageDocumentation
 */

// ============================================================================
// Type Unions
// ============================================================================

/**
 * The classification of a supporter based on their engagement level.
 * - Member: Active paid membership through GoCardless or Stripe
 * - Season Ticket Holder: Has purchased a season ticket product
 * - Ticket Buyer: Has purchased tickets within the last 365 days
 * - Shop Buyer: Has made shop purchases within the last 365 days
 * - Away Supporter: Primarily attends away matches
 * - Staff/VIP: Internal staff or VIP status
 * - Unknown: Insufficient data to classify
 */
export type SupporterType =
  | 'Member'
  | 'Season Ticket Holder'
  | 'Ticket Buyer'
  | 'Shop Buyer'
  | 'Away Supporter'
  | 'Staff/VIP'
  | 'Unknown';

/**
 * Source of the supporter type classification.
 * - auto: Automatically assigned by the classification system
 * - admin_override: Manually set by an administrator
 */
export type SupporterTypeSource = 'auto' | 'admin_override';

/**
 * The type of event recorded in the timeline.
 * - TicketPurchase: Ticket purchase from Future Ticketing
 * - StadiumEntry: Physical stadium entry scan
 * - ShopOrder: Purchase from Shopify store
 * - MembershipEvent: Membership status changes
 * - PaymentEvent: Payment through Stripe or GoCardless
 * - EmailClick: Email engagement from Mailchimp
 */
export type EventType =
  | 'TicketPurchase'
  | 'StadiumEntry'
  | 'ShopOrder'
  | 'MembershipEvent'
  | 'PaymentEvent'
  | 'EmailClick';

/**
 * External systems that integrate with Supporter 360.
 */
export type SourceSystem =
  | 'shopify'
  | 'stripe'
  | 'gocardless'
  | 'futureticketing'
  | 'mailchimp';

/**
 * Membership tier levels.
 * - Full: Standard adult membership
 * - OAP: Senior citizen discounted membership
 * - Student: Student discounted membership
 * - Overseas: International supporter membership
 */
export type MembershipTier = 'Full' | 'OAP' | 'Student' | 'Overseas';

/**
 * Payment frequency for memberships.
 */
export type MembershipCadence = 'Monthly' | 'Annual';

/**
 * Current status of a membership.
 * - Active: Membership is current and payments are up to date
 * - Past Due: Payment is overdue but within grace period
 * - Cancelled: Membership has been cancelled
 * - Unknown: Status could not be determined
 */
export type MembershipStatus = 'Active' | 'Past Due' | 'Cancelled' | 'Unknown';

/**
 * Payment method used for membership billing.
 */
export type BillingMethod = 'gocardless' | 'stripe';

// ============================================================================
// Core Domain Types
// ============================================================================

/**
 * Represents a single supporter in the system.
 *
 * A supporter is the central entity that aggregates data from all external
 * systems. Each supporter has a unique ID and can have multiple linked
 * external IDs from different systems.
 */
export interface Supporter {
  /** Unique identifier for this supporter (UUID) */
  supporter_id: string;
  /** Full name of the supporter */
  name: string | null;
  /** Primary email address used for contact */
  primary_email: string | null;
  /** Primary phone number */
  phone: string | null;
  /** Classification based on engagement patterns */
  supporter_type: SupporterType;
  /** Source of the current type classification */
  supporter_type_source: SupporterTypeSource;
  /** Flags that indicate special conditions */
  flags: {
    /** Email is shared by multiple people (prevents auto-merge) */
    shared_email?: boolean;
    /** Flagged as potential duplicate for review */
    duplicate_candidate?: boolean;
  };
  /** Map of external system IDs to their identifiers */
  linked_ids: {
    /** Shopify customer ID */
    shopify?: string;
    /** Future Ticketing customer ID */
    futureticketing?: string;
    /** Stripe customer ID */
    stripe?: string;
    /** GoCardless customer ID */
    gocardless?: string;
  };
  /** Timestamp when record was created */
  created_at: Date;
  /** Timestamp of last update */
  updated_at: Date;
}

/**
 * Represents an additional email address associated with a supporter.
 *
 * Email aliases allow supporters to have multiple email addresses linked
 * to their profile. Shared emails are flagged to prevent auto-merging.
 */
export interface EmailAlias {
  /** Auto-incrementing ID */
  id: number;
  /** Email address */
  email: string;
  /** Reference to the supporter record */
  supporter_id: string;
  /** Whether this email is shared by multiple people */
  is_shared: boolean;
  /** Timestamp when alias was added */
  created_at: Date;
}

/**
 * Represents a single event in the supporter's timeline.
 *
 * Events are immutable records of actions that occurred across all
 * integrated systems, providing a complete history of supporter engagement.
 */
export interface Event {
  /** Unique identifier for this event (UUID) */
  event_id: string;
  /** Reference to the supporter this event belongs to */
  supporter_id: string;
  /** External system that generated this event */
  source_system: SourceSystem;
  /** Type of event */
  event_type: EventType;
  /** When the event occurred in the source system */
  event_time: Date;
  /** External system's event identifier (for idempotency) */
  external_id: string | null;
  /** Monetary value associated with the event (if applicable) */
  amount: number | null;
  /** Currency code for the amount */
  currency: string | null;
  /** Additional event-specific data */
  metadata: Record<string, unknown>;
  /** S3 key to the raw webhook payload */
  raw_payload_ref: string | null;
  /** Timestamp when event was recorded in our system */
  created_at: Date;
}

/**
 * Represents a membership that a supporter holds.
 *
 * Memberships track recurring payment relationships with supporters,
 * typically for season tickets or official membership status.
 */
export interface Membership {
  /** Auto-incrementing ID */
  id: number;
  /** Reference to the supporter */
  supporter_id: string;
  /** Tier level of the membership */
  tier: MembershipTier | null;
  /** Payment frequency */
  cadence: MembershipCadence | null;
  /** Payment processor used */
  billing_method: BillingMethod | null;
  /** Current membership status */
  status: MembershipStatus;
  /** Date of the last successful payment */
  last_payment_date: Date | null;
  /** Expected date of the next payment */
  next_expected_payment_date: Date | null;
  /** Timestamp when membership record was created */
  created_at: Date;
  /** Timestamp of last update */
  updated_at: Date;
}

/**
 * Represents a supporter's membership in a specific Mailchimp audience.
 *
 * A single supporter can be in multiple Mailchimp audiences, each with
 * its own contact ID and set of tags.
 */
export interface MailchimpMembership {
  /** Auto-incrementing ID */
  id: number;
  /** Reference to the supporter */
  supporter_id: string;
  /** Mailchimp audience ID */
  audience_id: string;
  /** Mailchimp's contact identifier for this member */
  mailchimp_contact_id: string | null;
  /** Tags currently applied to this member */
  tags: string[];
  /** Timestamp of last tag sync with Mailchimp */
  last_synced_at: Date | null;
  /** Timestamp when membership record was created */
  created_at: Date;
  /** Timestamp of last update */
  updated_at: Date;
}

/**
 * Maps Future Ticketing products to their semantic meaning.
 *
 * This table allows the system to understand what different products
 * represent (e.g., season tickets, away match tickets).
 */
export interface FutureTicketingProductMapping {
  /** Auto-incrementing ID */
  id: number;
  /** Future Ticketing product ID */
  product_id: string | null;
  /** Future Ticketing category ID */
  category_id: string | null;
  /** Semantic meaning of this product/category */
  meaning: string;
  /** When this mapping becomes effective */
  effective_from: Date;
  /** Additional notes about this mapping */
  notes: string | null;
  /** Timestamp when mapping was created */
  created_at: Date;
}

/**
 * Represents an entry in the audit log for compliance and debugging.
 *
 * All administrative actions that modify data should be logged.
 */
export interface AuditLogEntry {
  /** Unique identifier for this audit entry (UUID) */
  audit_id: string;
  /** ID of the user who performed the action */
  actor_user_id: string | null;
  /** Type of action performed (e.g., 'merge', 'split', 'update') */
  action_type: string;
  /** When the action occurred */
  timestamp: Date;
  /** State before the action (JSON) */
  before_state: Record<string, unknown> | null;
  /** State after the action (JSON) */
  after_state: Record<string, unknown> | null;
  /** Human-readable reason for the action */
  reason: string | null;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request parameters for searching supporters.
 */
export interface SearchRequest {
  /** Search query string */
  query: string;
  /** Specific field to search (optional) */
  field?: 'email' | 'name' | 'phone' | 'all';
  /** Filter by supporter type (optional) */
  supporter_type?: SupporterType | SupporterType[];
  /** Maximum number of results to return */
  limit?: number;
  /** Number of results to skip for pagination */
  offset?: number;
}

/**
 * A simplified supporter representation for search results.
 */
export interface SearchResult {
  /** Unique identifier for this supporter */
  supporter_id: string;
  /** Full name of the supporter */
  name: string | null;
  /** Primary email address */
  email: string | null;
  /** Classification based on engagement patterns */
  supporter_type: SupporterType;
  /** Date of most recent ticket purchase */
  last_ticket_order_date: Date | null;
  /** Date of most recent shop purchase */
  last_shop_order_date: Date | null;
  /** Current membership status */
  membership_status: MembershipStatus | null;
  /** Date of most recent stadium entry */
  last_stadium_entry_date: Date | null;
}

/**
 * Overview section of the supporter profile.
 *
 * Contains aggregate data about the supporter's recent activity
 * across all integrated systems.
 */
export interface SupporterOverview {
  /** Most recent ticket purchase event */
  last_ticket_order: Event | null;
  /** Most recent shop order event */
  last_shop_order: Event | null;
  /** Membership details if active */
  membership: Membership | null;
  /** Most recent stadium entry event */
  last_stadium_entry: Event | null;
  /** Mailchimp audience memberships */
  mailchimp: MailchimpMembership[];
}

/**
 * Complete supporter profile with all related data.
 *
 * This is the most comprehensive view of a supporter, returned by the
 * profile API endpoint.
 */
export interface SupporterProfile extends Supporter {
  /** All email aliases associated with this supporter */
  emails: EmailAlias[];
  /** Overview aggregates */
  overview: SupporterOverview;
}

/**
 * Request parameters for retrieving a supporter's timeline.
 */
export interface TimelineRequest {
  /** Supporter ID to get timeline for */
  supporter_id: string;
  /** Filter by specific event types */
  event_types?: EventType[];
  /** Filter events after this date */
  start_date?: Date;
  /** Filter events before this date */
  end_date?: Date;
  /** Maximum number of events to return */
  limit?: number;
  /** Number of events to skip for pagination */
  offset?: number;
}

/**
 * A single event in the formatted timeline response.
 */
export interface TimelineEvent extends Event {
  /** Computed display title for the event */
  display_title?: string;
  /** Computed display description */
  display_description?: string;
}

/**
 * Request parameters for merging two supporter records.
 */
export interface MergeRequest {
  /** ID of the supporter to keep (primary) */
  primary_supporter_id: string;
  /** ID of the supporter to merge into primary (secondary) */
  secondary_supporter_id: string;
  /** ID of the user performing the merge */
  actor_user_id: string;
  /** Reason for the merge */
  reason?: string;
}

/**
 * Request parameters for the admin merge API endpoint.
 * Uses source_id/target_id terminology for clarity in admin operations.
 */
export interface AdminMergeRequest {
  /** ID of the supporter to merge from (will be deleted) */
  source_id: string;
  /** ID of the supporter to merge into (will be kept) */
  target_id: string;
  /** Reason for the merge */
  reason: string;
  /** Optional: ID of the user performing the merge (from auth context) */
  actor_user_id?: string;
}

/**
 * Request parameters for splitting a supporter record.
 */
export interface SplitRequest {
  /** ID of the supporter to split */
  supporter_id: string;
  /** Event IDs to move to the new supporter */
  event_ids_to_split: string[];
  /** Data for the new supporter record */
  new_supporter_data: {
    name?: string;
    primary_email?: string;
    phone?: string;
  };
  /** ID of the user performing the split */
  actor_user_id: string;
  /** Reason for the split */
  reason?: string;
}

// ============================================================================
// Webhook Payload Types
// ============================================================================

/**
 * Base interface for Shopify webhook payloads.
 */
export interface ShopifyWebhookPayload {
  /** Webhook event ID */
  id: number;
  /** Customer email (if available) */
  email?: string;
  /** ISO 8601 creation timestamp */
  created_at: string;
  /** ISO 8601 update timestamp */
  updated_at: string;
  /** Additional webhook-specific data */
  [key: string]: unknown;
}

/**
 * Base interface for Stripe webhook payloads.
 */
export interface StripeWebhookPayload {
  /** Stripe event ID */
  id: string;
  /** Event object type */
  object: string;
  /** Event type (e.g., 'payment_intent.succeeded') */
  type: string;
  /** Event data wrapper */
  data: {
    /** The actual event object */
    object: unknown;
  };
  /** Unix timestamp of event creation */
  created: number;
}

/**
 * Base interface for GoCardless webhook payloads.
 */
export interface GoCardlessWebhookPayload {
  /** Array of webhook events */
  events: Array<{
    /** GoCardless event ID */
    id: string;
    /** ISO 8601 creation timestamp */
    created_at: string;
    /** Type of resource affected */
    resource_type: string;
    /** Action that occurred */
    action: string;
    /** Related resource IDs */
    links: Record<string, string>;
  }>;
}

/**
 * Base interface for Mailchimp click event webhooks.
 */
export interface MailchimpClickEvent {
  /** Event type */
  type: 'click';
  /** Unix timestamp when event fired */
  fired_at: string;
  /** Event data */
  data: {
    /** Email address of the subscriber */
    email: string;
    /** Campaign ID that was clicked */
    campaign_id?: string;
    /** URL that was clicked */
    url?: string;
    /** Additional event-specific data */
    [key: string]: unknown;
  };
}
