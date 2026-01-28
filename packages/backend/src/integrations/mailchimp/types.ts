/**
 * Mailchimp API Types
 * API Documentation: https://mailchimp.com/developer/marketing/api/
 */

/**
 * Mailchimp Audience (List)
 */
export interface MailchimpAudience {
  id: string;
  web_id: number;
  name: string;
  contact: MailchimpContactInfo;
  campaign_defaults: MailchimpCampaignDefaults;
  subscribe_url_short?: string;
  subscribe_url_long?: string;
  beamer_address?: string;
  visibility: string;
  double_optin: boolean;
  marketing_permissions: boolean;
  modules: string[];
  stats: MailchimpStats;
  _links?: MailchimpLink[];
}

export interface MailchimpContactInfo {
  company: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
}

export interface MailchimpCampaignDefaults {
  from_name: string;
  from_email: string;
  subject: string;
  language: string;
}

export interface MailchimpStats {
  member_count: number;
  unsubscribe_count: number;
  cleaned_count: number;
  member_count_since_send: number;
  unsubscribe_count_since_send: number;
  cleaned_count_since_send: number;
  campaign_count: number;
  campaign_last_sent: string;
  merge_field_count: number;
  avg_sub_rate: number;
  avg_unsub_rate: number;
  avg_unsub_rate_last_30?: number;
  target_sub_rate: number;
  open_rate: number;
  click_rate: number;
  last_sub_date: string;
  last_unsub_date: string;
}

export interface MailchimpLink {
  rel: string;
  href: string;
  method: string;
  targetSchema?: string;
  schema?: string;
}

/**
 * Mailchimp Member (Contact in an Audience)
 */
export interface MailchimpMember {
  id: string;
  email_address: string;
  unique_email_id: string;
  email_type: string;
  status: MailchimpMemberStatus;
  unsubscribe_reason?: string;
  merge_fields: Record<string, unknown>;
  stats: MailchimpMemberStats;
  ip_signup?: string;
  timestamp_signup?: string;
  ip_opt?: string;
  timestamp_opt?: string;
  member_rating: number;
  last_changed: string;
  language: string;
  vip: boolean;
  email_client: string;
  location: MailchimpLocation;
  marketing_permissions?: MailchimpMarketingPermission[];
  source: string;
  tags_count: number;
  tags: MailchimpTag[];
  list_id: string;
  _links?: MailchimpLink[];
}

export type MailchimpMemberStatus =
  | 'subscribed'
  | 'unsubscribed'
  | 'cleaned'
  | 'pending'
  | 'transactional';

export interface MailchimpMemberStats {
  avg_open_rate: number;
  avg_click_rate: number;
  ecommerce_data?: MailchimpEcommerceData;
}

export interface MailchimpEcommerceData {
  total_revenue: number;
  number_of_orders: number;
  currency_code: string;
}

export interface MailchimpLocation {
  latitude: number;
  longitude: number;
  gmtoff: number;
  dstoff: number;
  country_code: string;
  timezone: string;
  region: string;
}

export interface MailchimpMarketingPermission {
  marketing_permission_id: string;
  text: string;
  enabled: boolean;
}

export interface MailchimpTag {
  id: number;
  name: string;
}

/**
 * Mailchimp Tag
 */
export interface MailchimpTagFull {
  id: number;
  name: string;
  total_members: number;
}

/**
 * Mailchimp Campaign
 */
export interface MailchimpCampaign {
  id: string;
  type: MailchimpCampaignType;
  create_time: string;
  update_time: string;
  archived: boolean;
  status: MailchimpCampaignStatus;
  emails_sent?: number;
  send_time?: string;
  content_type: string;
  recipients: MailchimpCampaignRecipients;
  settings: MailchimpCampaignSettings;
  variate_settings?: MailchimpVariateSettings;
  tracking: MailchimpCampaignTracking;
  rss_opts?: MailchimpRssOpts;
  ab_split_opts?: MailchimpAbSplitOpts;
  social_card?: MailchimpSocialCard;
  feedback?: MailchimpFeedback;
  _links?: MailchimpLink[];
}

export type MailchimpCampaignType =
  | 'regular'
  | 'plaintext'
  | 'absplit'
  | 'rss'
  | 'variate'
  | 'automation';

export type MailchimpCampaignStatus =
  | 'save'
  | 'paused'
  | 'schedule'
  | 'sending'
  | 'sent'
  | 'canceled'
  | 'archived';

export interface MailchimpCampaignRecipients {
  list_id: string;
  list_is_active: boolean;
  list_name: string;
  segment_text?: string;
  segment_opts?: MailchimpSegmentOpts;
  recipient_count?: number;
}

export interface MailchimpSegmentOpts {
  saved_segment_id?: number;
  match: 'any' | 'all';
  conditions: MailchimpCondition[];
}

export interface MailchimpCondition {
  condition_type: string;
  field?: {
    type: string;
    name: string;
  };
  op?: string;
  value?: unknown;
}

export interface MailchimpCampaignSettings {
  subject_line: string;
  title?: string;
  from_name: string;
  reply_to: string;
  use_conversation: boolean;
  to_name?: string;
  folder_id?: string;
  authenticate: boolean;
  auto_footer: boolean;
  inline_css: boolean;
  auto_tweet: boolean;
  fb_comments?: boolean;
  timewarp: boolean;
  template_id?: number;
  drag_and_drop: boolean;
}

export interface MailchimpVariateSettings {
  combination_count: number;
  combinations: MailchimpVariateCombination[];
  winner_criteria?: MailchimpWinnerCriteria;
  wait_time?: number;
  test_size?: number;
  from_name_combinations?: string[][];
  subject_line_combinations?: string[][];
  send_time?: string;
  send_time_best?: boolean;
  send_time_winner?: boolean;
}

export interface MailchimpVariateCombination {
  id: string;
  recipients?: number;
  opens?: number;
  clicks?: number;
}

export type MailchimpWinnerCriteria = 'opens' | 'clicks' | 'total' | 'manual';

export interface MailchimpCampaignTracking {
  opens: boolean;
  html_clicks: boolean;
  text_clicks: boolean;
  goal_tracking: boolean;
  ecomm360: boolean;
  google_analytics: string;
  salesforce: {
    campaign: boolean;
    notes: boolean;
  };
  highrise_campaign?: boolean;
  capsule_campaign?: boolean;
}

export interface MailchimpRssOpts {
  schedule: {
    hour: number;
    daily_send?: {
      from_name: string;
      from_email: string;
      us_hours_and_fr?: boolean;
    };
    days?: number[];
    frequency: string;
  };
}

export interface MailchimpAbSplitOpts {
  split_test: MailchimpSplitTest;
  pick_winner: MailchimpPickWinner;
  split_min?: number;
  split_size?: number;
  from_name?: string;
  from_email?: string;
  subject_lines?: string[];
  send_time_best?: boolean;
  send_time?: string;
  wait_time?: number;
}

export type MailchimpSplitTest = 'from_name' | 'subject_line' | 'send_time';

export type MailchimpPickWinner = 'opens' | 'clicks' | 'manual';

export interface MailchimpSocialCard {
  image_url?: string;
  description?: string;
  title?: string;
}

export interface MailchimpFeedback {
  summary: {
    is_campaign: boolean;
    type: string;
    total_items: number;
    top_items: MailchimpFeedbackItem[];
  };
  data_available: boolean;
}

export interface MailchimpFeedbackItem {
  value: string;
  total: number;
}

/**
 * Mailchimp Click Report
 */
export interface MailchimpClickReport {
  id: string;
  campaign_id: string;
  total_clicks: number;
  unique_clicks: number;
  subscriber_click: boolean;
  clicks_remaining?: number;
  url?: MailchimpUrlInfo;
  _links?: MailchimpLink[];
}

export interface MailchimpUrlInfo {
  id: string;
  web_id: number;
  url: string;
}

/**
 * Mailchimp Click Event (from webhook or report)
 */
export interface MailchimpClickEvent {
  type: 'click';
  fired_at: string;
  data: {
    list_id: string;
    campaign_id: string;
    campaign_url?: string;
    url?: string;
    url_id?: string;
    email: string;
    email_id?: string;
    merge_fields?: Record<string, unknown>;
    ip?: string;
    user_agent?: string;
  };
}

/**
 * Mailchimp Webhook Event Types
 */
export type MailchimpWebhookEventType =
  | 'subscribe'
  | 'unsubscribe'
  | 'profile'
  | 'upemail'
  | 'cleaned'
  | 'campaign'
  | 'click'; // Note: Click events may require premium

/**
 * Mailchimp API Response wrappers
 */
export interface MailchimpListResponse<T> {
  items: T[];
  total_items: number;
  _links?: MailchimpLink[];
}

export interface MailchimpPagedResponse<T> {
  items: T[];
  total_items: number;
  _links?: MailchimpLink[];
}

/**
 * Mailchimp Error Response
 */
export interface MailchimpError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: MailchimpFieldError[];
}

export interface MailchimpFieldError {
  field: string;
  message: string;
}

/**
 * Audience configuration for Shamrock Rovers
 */
export interface MailchimpAudienceConfig {
  id: string;
  name: string;
  type: 'Shop' | 'Members' | 'SeasonTicketHolders' | 'EveryoneElse';
  enabled: boolean;
}
