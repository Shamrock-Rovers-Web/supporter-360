import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '../hooks/useSupporters';
import { SupporterType } from '@supporter360/shared';

const SUPPORTER_TYPES: SupporterType[] = [
  'Member',
  'Season Ticket Holder',
  'Ticket Buyer',
  'Shop Buyer',
  'Away Supporter',
  'Staff/VIP',
  'Unknown',
];

const typeColors: Record<SupporterType, string> = {
  'Member': 'bg-blue-100 text-blue-800',
  'Season Ticket Holder': 'bg-purple-100 text-purple-800',
  'Ticket Buyer': 'bg-green-100 text-green-800',
  'Shop Buyer': 'bg-orange-100 text-orange-800',
  'Away Supporter': 'bg-red-100 text-red-800',
  'Staff/VIP': 'bg-yellow-100 text-yellow-800',
  'Unknown': 'bg-gray-100 text-gray-800',
};

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Loading skeleton component
function ResultsTableSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden animate-fade-in">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Ticket</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Shop</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Membership</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-40"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface ResultRowProps {
  result: {
    supporter_id: string;
    name: string | null;
    email: string | null;
    supporter_type: SupporterType;
    last_ticket_order_date: string | null;
    last_shop_order_date: string | null;
    membership_status: string | null;
  };
  onClick: () => void;
}

function ResultRow({ result, onClick }: ResultRowProps) {
  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-GB');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <tr
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className="hover:bg-emerald-50 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-inset animate-fade-in"
      role="button"
      aria-label={`View ${result.name || 'Unknown Name'}'s profile`}
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">
          {result.name || 'Unknown Name'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-600">{result.email || 'No email'}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-medium rounded ${typeColors[result.supporter_type]}`}>
          {result.supporter_type}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {formatDate(result.last_ticket_order_date)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {formatDate(result.last_shop_order_date)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {result.membership_status || 'Unknown'}
      </td>
    </tr>
  );
}

export function Search() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);
  const [selectedTypes, setSelectedTypes] = useState<SupporterType[]>([]);
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading, error } = useSearch(
    debouncedQuery,
    selectedTypes,
    limit,
    page * limit
  );

  // Reset to page 0 when search or filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedQuery, selectedTypes]);

  const toggleType = useCallback((type: SupporterType) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedTypes([]);
  }, []);

  const hasActiveSearch = debouncedQuery.length > 0;
  const results = data?.results ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.has_more ?? false;

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-900">Search Supporters</h1>
        <p className="text-gray-600 mt-1">
          Search by name, email, or phone number to find supporter records.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow p-4 animate-fade-in-delay-1">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            autoFocus
            aria-label="Search supporters"
          />
          <svg
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {isLoading && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 animate-fade-in-delay-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">Filter by Supporter Type</h3>
          {selectedTypes.length > 0 && (
            <button
              onClick={clearFilters}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium underline focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded"
              aria-label={`Clear all ${selectedTypes.length} applied filters`}
            >
              Clear all
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Supporter type filters">
          {SUPPORTER_TYPES.map(type => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              aria-pressed={selectedTypes.includes(type)}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                ${selectedTypes.includes(type)
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {type}
            </button>
          ))}
        </div>
        {selectedTypes.length > 0 && (
          <p className="mt-3 text-sm text-gray-500" role="status" aria-live="polite">
            {selectedTypes.length} filter{selectedTypes.length > 1 ? 's' : ''} applied
          </p>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
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

      {/* Initial State */}
      {!hasActiveSearch && !error && (
        <div className="bg-white rounded-lg shadow p-12 text-center animate-fade-in">
          <svg
            className="w-16 h-16 text-emerald-100 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Start your search</h3>
          <p className="text-gray-500">Enter a name, email, or phone number above to find supporters.</p>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && hasActiveSearch && <ResultsTableSkeleton />}

      {/* Results Table */}
      {!isLoading && hasActiveSearch && results.length > 0 && (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{total}</span> result{total !== 1 ? 's' : ''} found
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Ticket
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Shop
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Membership
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map(result => (
                    <ResultRow
                      key={result.supporter_id}
                      result={result}
                      onClick={() => navigate(`/supporters/${result.supporter_id}`)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination - Load More */}
          {hasMore && (
            <div className="flex justify-center">
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={isLoading}
                className="px-6 py-3 bg-white border border-gray-300 rounded-lg shadow-sm text-gray-700 font-medium hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Loading...' : 'Load more results'}
              </button>
            </div>
          )}
        </>
      )}

      {/* No Results */}
      {!isLoading && hasActiveSearch && results.length === 0 && !error && (
        <div className="bg-white rounded-lg shadow p-12 text-center animate-fade-in">
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
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No results found</h3>
          <p className="text-gray-500">
            Try adjusting your search terms or filters to find what you're looking for.
          </p>
        </div>
      )}
    </div>
  );
}
