import { useState, useCallback } from 'react';
import { useSupporterTimeline } from '../hooks/useSupporters';
import { EventType, SourceSystem } from '@supporter360/shared';

const EVENT_TYPES: EventType[] = [
  'TicketPurchase',
  'StadiumEntry',
  'ShopOrder',
  'MembershipEvent',
  'PaymentEvent',
  'EmailClick',
];

const eventTypeLabels: Record<EventType, string> = {
  'TicketPurchase': 'Ticket Purchase',
  'StadiumEntry': 'Stadium Entry',
  'ShopOrder': 'Shop Order',
  'MembershipEvent': 'Membership',
  'PaymentEvent': 'Payment',
  'EmailClick': 'Email Click',
};

const eventTypeIcons: Record<EventType, string> = {
  'TicketPurchase': '🎫',
  'StadiumEntry': '🏟️',
  'ShopOrder': '🛍️',
  'MembershipEvent': '⭐',
  'PaymentEvent': '💳',
  'EmailClick': '📧',
};

// Color coding by source system
const sourceSystemColors: Record<SourceSystem, { bg: string; border: string; text: string; icon: string }> = {
  shopify: {
    bg: 'bg-green-50',
    border: 'border-green-500',
    text: 'text-green-800',
    icon: '🛍️',
  },
  stripe: {
    bg: 'bg-purple-50',
    border: 'border-purple-500',
    text: 'text-purple-800',
    icon: '💳',
  },
  gocardless: {
    bg: 'bg-blue-50',
    border: 'border-blue-500',
    text: 'text-blue-800',
    icon: '🔄',
  },
  futureticketing: {
    bg: 'bg-orange-50',
    border: 'border-orange-500',
    text: 'text-orange-800',
    icon: '🎫',
  },
  mailchimp: {
    bg: 'bg-pink-50',
    border: 'border-pink-500',
    text: 'text-pink-800',
    icon: '📧',
  },
};

// Loading skeleton
function TimelineSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start p-4 bg-white border border-gray-200 rounded-lg">
          <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse mr-4 flex-shrink-0"></div>
          <div className="flex-1">
            <div className="h-5 bg-gray-200 rounded animate-pulse w-40 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-64"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
        </div>
      ))}
    </div>
  );
}

// Empty state
function TimelineEmptyState() {
  return (
    <div className="text-center py-12">
      <svg
        className="w-16 h-16 text-gray-300 mx-auto mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
      <p className="text-gray-500">
        This supporter doesn't have any recorded events yet, or try adjusting your filters.
      </p>
    </div>
  );
}

// Event Card Component
interface EventCardProps {
  event: {
    event_id: string;
    source_system: SourceSystem;
    event_type: EventType;
    event_time: string;
    amount: number | null;
    metadata: Record<string, unknown>;
  };
}

function EventCard({ event }: EventCardProps) {
  const systemConfig = sourceSystemColors[event.source_system];
  const typeLabel = eventTypeLabels[event.event_type] || event.event_type;
  const typeIcon = eventTypeIcons[event.event_type] || '📄';

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffTime = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount: number | null) => {
    if (amount === null) return null;
    return `€${amount.toFixed(2)}`;
  };

  // Extract key metadata for display
  const getMetadataDisplay = () => {
    const meta = event.metadata || {};
    const items: { key: string; value: string; link?: string }[] = [];

    if (event.event_type === 'ShopOrder') {
      if (meta.order_id) items.push({ key: 'Order', value: String(meta.order_id) });
      if (meta.order_name) items.push({ key: 'Product', value: String(meta.order_name) });
    }
    if (event.event_type === 'TicketPurchase') {
      if (meta.order_id) items.push({ key: 'Order', value: String(meta.order_id) });
      if (meta.status) items.push({ key: 'Status', value: String(meta.status) });
      // FT orders: skip line items here, they're rendered separately below
      if (meta.match_name && !meta.detail) items.push({ key: 'Match', value: String(meta.match_name) });
    }
    if (event.event_type === 'StadiumEntry') {
      if (meta.match_name) items.push({ key: 'Match', value: String(meta.match_name) });
      if (meta.gate) items.push({ key: 'Gate', value: String(meta.gate) });
      if (meta.barcode) items.push({ key: 'Barcode', value: String(meta.barcode).slice(-8) });
    }
    if (event.event_type === 'PaymentEvent') {
      if (meta.payment_id) items.push({ key: 'Payment', value: String(meta.payment_id) });
      if (meta.description) items.push({ key: 'Description', value: String(meta.description) });
    }
    if (event.event_type === 'EmailClick') {
      if (meta.campaign_id) items.push({ key: 'Campaign', value: String(meta.campaign_id) });
      if (meta.url) {
        items.push({
          key: 'URL',
          value: String(meta.url).length > 40 ? String(meta.url).slice(0, 40) + '...' : String(meta.url),
          link: String(meta.url),
        });
      }
    }
    if (event.event_type === 'MembershipEvent') {
      if (meta.status) items.push({ key: 'Status', value: String(meta.status) });
      if (meta.tier) items.push({ key: 'Tier', value: String(meta.tier) });
    }

    return items;
  };

  // Check if this is a Future Ticketing order with detail array
  const isFTOrder = event.source_system === 'futureticketing' && event.event_type === 'TicketPurchase' && Array.isArray(event.metadata?.detail);

  // Get FT line items
  const getFTLineItems = () => {
    if (!isFTOrder) return null;
    const detail = event.metadata?.detail || [];
    return detail.filter((d: { product?: string }) => d.product).slice(0, 5); // Max 5 items to avoid clutter
  };

  // Get FT scan info from barcodes
  const getFTScans = () => {
    if (!isFTOrder) return null;
    const detail = event.metadata?.detail || [];
    const scans: { barcode: string; scanTime: string; scanner: string }[] = [];
    for (const d of detail) {
      const barcodes = d.barcode || [];
      for (const b of barcodes) {
        if (b.scan_datetime) {
          scans.push({
            barcode: b.barcode_ean13?.slice(-8) || b.barcode?.slice(-8) || 'Unknown',
            scanTime: b.scan_datetime,
            scanner: b.scanner_no || b.scan_detail || 'Gate',
          });
        }
      }
    }
    return scans.length > 0 ? scans : null;
  };

  // Get FT extra fields (DOB, etc.)
  const getFTExtraFields = () => {
    if (!isFTOrder) return null;
    const extraFields = event.metadata?.extra_field || [];
    if (!Array.isArray(extraFields) || extraFields.length === 0) return null;
    const fields: { key: string; value: string }[] = [];
    for (const ef of extraFields) {
      if (ef.extra_field_name && ef.value) {
        let label = ef.extra_field_name
          .replace(/([A-Z])/g, ' $1')
          .replace(/^MembershipName/, '')
          .replace(/SeasonTicketDateofBirth/i, 'Date of Birth')
          .trim();
        fields.push({ key: label, value: ef.value });
      }
    }
    return fields.length > 0 ? fields : null;
  };

  const ftLineItems = getFTLineItems();
  const ftScans = getFTScans();
  const ftExtraFields = getFTExtraFields();

  const metadataItems = getMetadataDisplay();

  return (
    <div
      className={`flex items-start p-4 rounded-lg border-l-4 ${systemConfig.bg} ${systemConfig.border} hover:shadow-md transition-shadow`}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-full ${systemConfig.bg} border ${systemConfig.border} flex items-center justify-center mr-4 flex-shrink-0`}>
        <span className="text-lg" style={{ fontSize: '1.125rem', lineHeight: 1.2 }}>{typeIcon}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
          <div>
            <h4 className={`font-semibold ${systemConfig.text}`}>
              {typeLabel}
            </h4>
            <p className="text-sm text-gray-500 capitalize flex items-center">
              <span className="mr-1">{systemConfig.icon}</span>
              {event.source_system}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">{formatDate(event.event_time)}</div>
            <div className="text-xs text-gray-500">{formatTime(event.event_time)}</div>
          </div>
        </div>

        {event.amount !== null && (
          <div className="mb-2">
            <span className="text-lg font-semibold text-gray-900">
              {formatAmount(event.amount)}
            </span>
          </div>
        )}

        {/* Metadata */}
        {metadataItems.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {metadataItems.map((item) => (
              <span key={item.key} className="text-gray-600">
                <span className="font-medium">{item.key}:</span>{' '}
                {item.link ? (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {item.value}
                    <svg
                      className="inline w-3 h-3 ml-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                ) : (
                  <span className="text-gray-800">{item.value}</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* FT Line Items */}
        {ftLineItems && ftLineItems.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Items</p>
            <div className="space-y-1">
              {ftLineItems.map((item: { product?: string; event?: string; quantity?: string; event_date?: string }, idx: number) => (
                <div key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  <div>
                    <span className="font-medium text-gray-800">{item.product || 'Item'}</span>
                    {item.event && (
                      <span className="text-gray-500 ml-1">({item.event})</span>
                    )}
                    {item.quantity && item.quantity !== '1' && (
                      <span className="text-gray-500 ml-1">×{item.quantity}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FT Scan History */}
        {ftScans && ftScans.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Scanned In
            </p>
            <div className="space-y-1">
              {ftScans.map((scan, idx) => (
                <div key={idx} className="text-sm flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-gray-600">
                    {new Date(scan.scanTime).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">{scan.scanner}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FT Extra Fields (DOB, etc) */}
        {ftExtraFields && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Details</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {ftExtraFields.map((field, idx) => (
                <span key={idx} className="text-gray-600">
                  <span className="font-medium">{field.key}:</span>{' '}
                  <span className="text-gray-800">{field.value}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Expandable raw metadata */}
        {Object.keys(event.metadata || {}).length > 0 && !isFTOrder && (
          <details className="mt-3">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 select-none">
              View all details
            </summary>
            <pre className="mt-2 text-xs bg-white p-3 rounded border border-gray-200 overflow-auto max-h-40">
              {JSON.stringify(event.metadata, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

// Date Group Header
interface DateGroupHeaderProps {
  date: string;
  count: number;
}

function DateGroupHeader({ date, count }: DateGroupHeaderProps) {
  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return d.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  return (
    <div className="flex items-center my-4 first:mt-0">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mr-3">
        {formatDate(date)}
      </h3>
      <div className="flex-1 h-px bg-gray-200"></div>
      <span className="ml-3 text-xs text-gray-500">{count} event{count !== 1 ? 's' : ''}</span>
    </div>
  );
}

interface TimelineProps {
  supporterId: string;
}

export function Timeline({ supporterId }: TimelineProps) {
  const [selectedTypes, setSelectedTypes] = useState<EventType[]>([]);
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data: timelineData, isLoading, error } = useSupporterTimeline(
    supporterId,
    selectedTypes.length > 0 ? selectedTypes : undefined,
    limit,
    page * limit
  );

  const events = timelineData?.events ?? [];
  const total = timelineData?.total ?? 0;
  const hasMore = timelineData?.has_more ?? false;

  // Group events by date, sorted newest first
  const groupedEvents = events.reduce((acc, event) => {
    const dateKey = new Date(event.event_time).toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, typeof events>);

  // Sort date groups by date descending (newest first)
  const sortedDateGroups = Object.entries(groupedEvents).sort((a, b) => {
    return new Date(b[0]).getTime() - new Date(a[0]).getTime();
  });

  const toggleType = useCallback((type: EventType) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
    setPage(0); // Reset pagination when filters change
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedTypes([]);
    setPage(0);
  }, []);

  const loadMore = useCallback(() => {
    setPage(p => p + 1);
  }, []);

  return (
    <div>
      {/* Type Filters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">Filter by event type</h3>
          {selectedTypes.length > 0 && (
            <button
              onClick={clearFilters}
              className="text-sm text-green-600 hover:text-green-700 font-medium underline focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded"
              aria-label={`Clear all ${selectedTypes.length} applied event type filters`}
            >
              Clear all
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Event type filters">
          {EVENT_TYPES.map(type => {
            const isSelected = selectedTypes.includes(type);
            const isFiltered = selectedTypes.length > 0;
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                aria-pressed={isSelected}
                className={`
                  inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                  ${isSelected
                    ? 'bg-green-600 text-white shadow-sm'
                    : isFiltered
                      ? 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                      : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
                  }
                `}
              >
                <span className="mr-1.5" aria-hidden="true">{eventTypeIcons[type]}</span>
                <span className="sr-only">{eventTypeLabels[type]} event</span>
                {eventTypeLabels[type]}
              </button>
            );
          })}
        </div>
        {selectedTypes.length > 0 && (
          <p className="mt-3 text-sm text-gray-500" role="status" aria-live="polite">
            Showing {selectedTypes.length} event type{selectedTypes.length > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-red-500 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-red-700">{error.message}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && events.length === 0 && <TimelineSkeleton />}

      {/* Events Grouped by Date */}
      {!isLoading && events.length > 0 && (
        <div className="space-y-2" role="feed" aria-label="Supporter timeline events">
          {sortedDateGroups.map(([dateKey, dateEvents]) => (
            <div key={dateKey}>
              <DateGroupHeader date={dateKey} count={dateEvents.length} />
              <div className="space-y-3">
                {dateEvents.map(event => (
                  <EventCard key={event.event_id} event={event} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && events.length === 0 && !error && (
        <TimelineEmptyState />
      )}

      {/* Load More */}
      {hasMore && events.length > 0 && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="px-6 py-3 bg-white border border-gray-300 rounded-lg shadow-sm text-gray-700 font-medium hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Loading...' : `Load more events (${total - events.length} remaining)`}
          </button>
        </div>
      )}

      {/* Results Count */}
      {!isLoading && events.length > 0 && !hasMore && (
        <div className="mt-6 text-center text-sm text-gray-500">
          Showing all {total} event{total !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
