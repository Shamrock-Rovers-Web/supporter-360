import { useSupporterTimeline } from '../../hooks/useSupporters';
import { SourceSystem } from '@supporter360/shared';

// Color coding by source system (same as Timeline.tsx)
const sourceSystemColors: Record<SourceSystem, { bg: string; border: string; text: string; icon: string }> = {
  shopify: {
    bg: 'bg-green-50',
    border: 'border-green-500',
    text: 'text-green-800',
    icon: '🛍️',
  },
  futureticketing: {
    bg: 'bg-orange-50',
    border: 'border-orange-500',
    text: 'text-orange-800',
    icon: '🎫',
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
  mailchimp: {
    bg: 'bg-pink-50',
    border: 'border-pink-500',
    text: 'text-pink-800',
    icon: '📧',
  },
};

// Loading skeleton
function PurchasesSkeleton() {
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
function PurchasesEmptyState() {
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
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No purchases found</h3>
      <p className="text-gray-500">
        This supporter doesn't have any recorded ticket purchases or shop orders yet.
      </p>
    </div>
  );
}

// Purchase Card Component
interface PurchaseCardProps {
  event: {
    event_id: string;
    source_system: SourceSystem;
    event_type: string;
    event_time: string;
    amount: number | null;
    metadata: Record<string, unknown>;
  };
}

function PurchaseCard({ event }: PurchaseCardProps) {
  const systemConfig = sourceSystemColors[event.source_system];

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

  const formatAmount = (amount: number | null | undefined): string | null => {
    if (amount === null || amount === undefined || typeof amount !== 'number' || isNaN(amount)) return null;
    return `€${amount.toFixed(2)}`;
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

  // Extract key metadata for display
  const getMetadataDisplay = () => {
    const meta = event.metadata || {};
    const items: { key: string; value: string }[] = [];

    if (event.event_type === 'ShopOrder') {
      if (meta.order_id) items.push({ key: 'Order', value: String(meta.order_id) });
      if (meta.order_name) items.push({ key: 'Product', value: String(meta.order_name) });
    }
    if (event.event_type === 'TicketPurchase') {
      if (meta.order_id) items.push({ key: 'Order', value: String(meta.order_id) });
      if (meta.status) items.push({ key: 'Status', value: String(meta.status) });
    }

    return items;
  };

  const ftLineItems = getFTLineItems();
  const ftScans = getFTScans();
  const ftExtraFields = getFTExtraFields();
  const metadataItems = getMetadataDisplay();

  const typeLabel = event.event_type === 'TicketPurchase' ? 'Ticket Purchase' :
                    event.event_type === 'ShopOrder' ? 'Shop Order' :
                    event.event_type;
  const typeIcon = event.event_type === 'TicketPurchase' ? '🎫' :
                   event.event_type === 'ShopOrder' ? '🛍️' :
                   '📄';

  return (
    <div
      className={`flex items-start p-4 rounded-lg border-l-4 ${systemConfig.bg} ${systemConfig.border} hover:shadow-md transition-shadow`}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-full ${systemConfig.bg} border ${systemConfig.border} flex items-center justify-center mr-4 flex-shrink-0`}>
        <span className="text-lg leading-tight">{typeIcon}</span>
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
                <span className="text-gray-800">{item.value}</span>
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
      </div>
    </div>
  );
}

interface PurchasesTabProps {
  supporterId: string;
}

export function PurchasesTab({ supporterId }: PurchasesTabProps) {
  // Filter for only TicketPurchase and ShopOrder events
  const { data: events, isLoading, error } = useSupporterTimeline(
    supporterId,
    ['TicketPurchase', 'ShopOrder']
  );

  if (isLoading) {
    return <PurchasesSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-16 h-16 text-red-300 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading purchases</h3>
        <p className="text-gray-500">{error.message}</p>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return <PurchasesEmptyState />;
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <PurchaseCard key={event.event_id} event={event} />
      ))}
    </div>
  );
}
