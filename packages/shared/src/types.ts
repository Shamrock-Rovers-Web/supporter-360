// Shared types for Supporter 360

export type SupporterType =
  | 'Member'
  | 'Season Ticket Holder'
  | 'Ticket Buyer'
  | 'Shop Buyer'
  | 'Away Supporter'
  | 'Staff/VIP'
  | 'Unknown';

export type SupporterTypeSource = 'auto' | 'admin_override';

export type EventType =
  | 'TicketPurchase'
  | 'StadiumEntry'
  | 'ShopOrder'
  | 'MembershipEvent'
  | 'PaymentEvent'
  | 'EmailClick';

export type SourceSystem =
  | 'shopify'
  | 'stripe'
  | 'gocardless'
  | 'futureticketing'
  | 'mailchimp';

export type MembershipTier = 'Full' | 'OAP' | 'Student' | 'Overseas';
export type MembershipCadence = 'Monthly' | 'Annual';
export type MembershipStatus = 'Active' | 'Past Due' | 'Cancelled' | 'Unknown';
export type BillingMethod = 'gocardless' | 'stripe';

export interface Supporter {
  supporter_id: string;
  name: string | null;
  primary_email: string | null;
  phone: string | null;
  supporter_type: SupporterType;
  supporter_type_source: SupporterTypeSource;
  flags: {
    shared_email?: boolean;
    duplicate_candidate?: boolean;
  };
  linked_ids: {
    shopify?: string;
    futureticketing?: string;
    stripe?: string;
    gocardless?: string;
  };
  created_at: Date;
  updated_at: Date;
}

export interface EmailAlias {
  id: number;
  email: string;
  supporter_id: string;
  is_shared: boolean;
  created_at: Date;
}

export interface Event {
  event_id: string;
  supporter_id: string;
  source_system: SourceSystem;
  event_type: EventType;
  event_time: Date;
  external_id: string | null;
  amount: number | null;
  currency: string | null;
  metadata: Record<string, any>;
  raw_payload_ref: string | null;
  created_at: Date;
}

export interface MailchimpMembership {
  id: number;
  supporter_id: string;
  audience_id: string;
  mailchimp_contact_id: string | null;
  tags: string[];
  last_synced_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface FutureTicketingProductMapping {
  id: number;
  product_id: string | null;
  category_id: string | null;
  meaning: string;
  effective_from: Date;
  notes: string | null;
  created_at: Date;
}

export interface AuditLog {
  audit_id: string;
  actor_user_id: string | null;
  action_type: string;
  timestamp: Date;
  before_state: Record<string, any> | null;
  after_state: Record<string, any> | null;
  reason: string | null;
}

export interface Membership {
  id: number;
  supporter_id: string;
  tier: MembershipTier | null;
  cadence: MembershipCadence | null;
  billing_method: BillingMethod | null;
  status: MembershipStatus;
  last_payment_date: Date | null;
  next_expected_payment_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

// API Request/Response types

export interface SearchRequest {
  query: string;
  field?: 'email' | 'name' | 'phone' | 'all';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  supporter_id: string;
  name: string | null;
  email: string | null;
  supporter_type: SupporterType;
  last_ticket_order_date: Date | null;
  last_shop_order_date: Date | null;
  membership_status: MembershipStatus | null;
  last_stadium_entry_date: Date | null;
}

export interface SupporterProfile extends Supporter {
  emails: EmailAlias[];
  membership: Membership | null;
  mailchimp_memberships: MailchimpMembership[];
  last_ticket_order: Event | null;
  last_shop_order: Event | null;
  last_stadium_entry: Event | null;
}

export interface TimelineRequest {
  supporter_id: string;
  event_types?: EventType[];
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
}

export interface MergeRequest {
  primary_supporter_id: string;
  secondary_supporter_id: string;
  actor_user_id: string;
  reason?: string;
}

export interface SplitRequest {
  supporter_id: string;
  event_ids_to_split: string[];
  new_supporter_data: {
    name?: string;
    primary_email?: string;
    phone?: string;
  };
  actor_user_id: string;
  reason?: string;
}

// Webhook payload types

export interface ShopifyWebhookPayload {
  id: number;
  email?: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface StripeWebhookPayload {
  id: string;
  object: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

export interface GoCardlessWebhookPayload {
  events: Array<{
    id: string;
    created_at: string;
    resource_type: string;
    action: string;
    links: Record<string, string>;
  }>;
}

export interface MailchimpClickEvent {
  type: 'click';
  fired_at: string;
  data: {
    email: string;
    campaign_id?: string;
    url?: string;
    [key: string]: any;
  };
}
