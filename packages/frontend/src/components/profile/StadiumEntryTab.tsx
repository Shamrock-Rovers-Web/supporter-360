import { useMemo } from 'react';
import { useSupporterTimeline } from '../hooks/useSupporters';
import { SourceSystem } from '@supporter360/shared';

// Source system color configuration (matches Timeline.tsx)
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
function StadiumEntrySkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>
            <div className="flex-1">
              <div className="h-5 bg-gray-200 rounded animate-pulse w-32 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-48"></div>
            </div>
          </div>
          <div className="ml-13 space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-40"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-36"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Empty state
function StadiumEntryEmptyState() {
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
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No stadium entries found</h3>
      <p className="text-gray-500">
        This supporter doesn't have any recorded stadium entries yet. Stadium entries appear here when tickets are scanned at the gate.
      </p>
    </div>
  );
}

// Scan Card Component
interface ScanCardProps {
  scan: {
    event_id: string;
    source_system: SourceSystem;
    event_time: string;
    metadata: Record<string, unknown>;
  };
}

function ScanCard({ scan }: ScanCardProps) {
  const systemConfig = sourceSystemColors[scan.source_system];
  const meta = scan.metadata || {};

  const matchName = meta.match_name as string | undefined;
  const gate = meta.gate as string | undefined;
  const barcode = meta.barcode as string | undefined;
  const scanDatetime = meta.scan_datetime as string | undefined;

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

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get last 8 digits of barcode
  const getShortBarcode = (full: string) => {
    return full.slice(-8);
  };

  return (
    <div
      className={`p-4 rounded-lg border-l-4 ${systemConfig.bg} ${systemConfig.border} hover:shadow-md transition-shadow`}
    >
      {/* Header: Match name and date */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {/* Success indicator */}
          <span className="text-green-500 text-xl">✓</span>
          <h4 className={`font-semibold text-lg ${systemConfig.text}`}>
            {matchName || 'Unknown Match'}
          </h4>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">{formatDate(scan.event_time)}</div>
          <div className="text-xs text-gray-500">{formatTime(scan.event_time)}</div>
        </div>
      </div>

      {/* Scan details */}
      <div className="ml-8 space-y-1">
        {/* Scan datetime (precise) */}
        {scanDatetime && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Scanned:</span>
            <span className="text-gray-700 font-medium">{formatDateTime(scanDatetime)}</span>
          </div>
        )}

        {/* Gate */}
        {gate && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Gate:</span>
            <span className="text-gray-700 font-medium">{gate}</span>
          </div>
        )}

        {/* Barcode (last 8 digits) */}
        {barcode && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Barcode:</span>
            <span className="text-gray-700 font-mono">{getShortBarcode(barcode)}</span>
          </div>
        )}

        {/* Source system badge */}
        <div className="flex items-center gap-2 text-sm mt-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${systemConfig.bg} ${systemConfig.border} ${systemConfig.text}`}>
            <span className="mr-1">{systemConfig.icon}</span>
            {scan.source_system}
          </span>
        </div>
      </div>
    </div>
  );
}

// Match Group Header
interface MatchGroupHeaderProps {
  matchName: string;
  count: number;
  date: string;
}

function MatchGroupHeader({ matchName, count, date }: MatchGroupHeaderProps) {
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
      <h3 className="text-base font-semibold text-gray-800 mr-3">
        {matchName}
      </h3>
      <div className="flex-1 h-px bg-gray-200"></div>
      <span className="ml-3 text-xs text-gray-500">
        {formatDate(date)} • {count} scan{count !== 1 ? 's' : ''}
      </span>
    </div>
  );
}

interface StadiumEntryTabProps {
  supporterId: string;
}

export function StadiumEntryTab({ supporterId }: StadiumEntryTabProps) {
  // Filter for only StadiumEntry events
  const { data: events, isLoading, error } = useSupporterTimeline(
    supporterId,
    ['StadiumEntry'],
    100 // Get up to 100 entries
  );

  // Group events by match name
  const groupedByMatch = useMemo(() => {
    const groups: Record<string, typeof events> = {};

    for (const event of events) {
      const matchName = (event.metadata?.match_name as string) || 'Unknown Match';
      if (!groups[matchName]) {
        groups[matchName] = [];
      }
      groups[matchName].push(event);
    }

    // Sort groups by most recent scan
    const sortedGroups = Object.entries(groups).sort((a, b) => {
      const aLatest = a[1].reduce((latest, e) => {
        const eTime = new Date(e.event_time).getTime();
        return eTime > latest ? eTime : latest;
      }, 0);
      const bLatest = b[1].reduce((latest, e) => {
        const eTime = new Date(e.event_time).getTime();
        return eTime > latest ? eTime : latest;
      }, 0);
      return bLatest - aLatest;
    });

    return sortedGroups;
  }, [events]);

  return (
    <div>
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
      {isLoading && events.length === 0 && <StadiumEntrySkeleton />}

      {/* Entries grouped by match */}
      {!isLoading && events.length > 0 && (
        <div className="space-y-2" role="feed" aria-label="Stadium entry scan history">
          {groupedByMatch.map(([matchName, scans]) => (
            <div key={matchName}>
              <MatchGroupHeader
                matchName={matchName}
                count={scans.length}
                date={scans[0].event_time}
              />
              <div className="space-y-3">
                {scans.map(scan => (
                  <ScanCard key={scan.event_id} scan={scan} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && events.length === 0 && !error && (
        <StadiumEntryEmptyState />
      )}

      {/* Results count */}
      {!isLoading && events.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-500">
          Showing {events.length} stadium entr{events.length !== 1 ? 'ies' : 'y'}
          {events.length >= 100 && '+'}
        </div>
      )}
    </div>
  );
}
