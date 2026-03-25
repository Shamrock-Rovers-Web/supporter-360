import { useState, useCallback, useEffect, useRef, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '../hooks/useSupporters';
import { SupporterType } from '@supporter360/shared';
import { Card } from '../components/ui/Card';
import { Badge, getSupporterTypeBadgeVariant, getMembershipStatusVariant } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

const SUPPORTER_TYPES: SupporterType[] = [
  'Member',
  'Season Ticket Holder',
  'Ticket Buyer',
  'Shop Buyer',
  'Away Supporter',
  'Staff/VIP',
  'Unknown',
];

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

// Search Icon Component
function SearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

// Close Icon Component
function CloseIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

// User Icon Component
function UserIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

// Calendar Icon Component
function CalendarIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

// Shopping Bag Icon Component
function ShoppingBagIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
      />
    </svg>
  );
}

// Shield Icon Component
function ShieldIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

// Arrow Right Icon Component
function ArrowRightIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

// Loading skeleton component
function ResultCardSkeleton() {
  return (
    <Card variant="default" padding="lg" className="animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-5 bg-slate-200 rounded w-40 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-56"></div>
        </div>
        <div className="h-6 bg-slate-200 rounded-full w-24"></div>
      </div>
      <div className="mt-4 flex gap-6">
        <div className="h-4 bg-slate-200 rounded w-24"></div>
        <div className="h-4 bg-slate-200 rounded w-24"></div>
        <div className="h-4 bg-slate-200 rounded w-20"></div>
      </div>
    </Card>
  );
}

interface ResultCardProps {
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
  isSelected: boolean;
  index: number;
}

function ResultCard({ result, onClick, isSelected, index }: ResultCardProps) {
  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      variant="default"
      padding="lg"
      interactive
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View ${result.name || 'Unknown'}'s profile`}
      className={`
        group relative cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2
        ${isSelected ? 'ring-2 ring-brand-green-500 bg-brand-green-50' : ''}
        animate-fade-in-up
      `}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Hover indicator */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRightIcon className="w-5 h-5 text-brand-green-500" />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-brand-green-500 to-brand-green-600 flex items-center justify-center text-white font-semibold">
              {result.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900 truncate group-hover:text-brand-green-600 transition-colors">
                {result.name || 'Unknown Name'}
              </h3>
              <p className="text-sm text-slate-500 truncate">{result.email || 'No email'}</p>
            </div>
          </div>
        </div>
        <Badge variant={getSupporterTypeBadgeVariant(result.supporter_type)} size="md">
          {result.supporter_type}
        </Badge>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center gap-1.5 text-slate-600">
          <CalendarIcon className="w-4 h-4 text-slate-400" />
          <span className="font-medium">Ticket:</span>
          <span>{formatDate(result.last_ticket_order_date)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <ShoppingBagIcon className="w-4 h-4 text-slate-400" />
          <span className="font-medium">Shop:</span>
          <span>{formatDate(result.last_shop_order_date)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldIcon className="w-4 h-4 text-slate-400" />
          <span className="font-medium text-slate-600">Membership:</span>
          <Badge
            variant={getMembershipStatusVariant(result.membership_status || '')}
            size="sm"
          >
            {result.membership_status || 'Unknown'}
          </Badge>
        </div>
      </div>
    </Card>
  );
}

export function Search() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);
  const [selectedTypes, setSelectedTypes] = useState<SupporterType[]>([]);
  const [page, setPage] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
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
    setSelectedIndex(-1);
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (!hasActiveSearch || results.length === 0) return;

      // Focus search on Escape
      if (e.key === 'Escape') {
        searchInputRef.current?.focus();
        setSelectedIndex(-1);
        return;
      }

      // Focus search on Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // Arrow key navigation only when not in input
      if (document.activeElement !== searchInputRef.current) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, -1));
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
          e.preventDefault();
          navigate(`/supporters/${results[selectedIndex].supporter_id}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasActiveSearch, results, selectedIndex, navigate]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const cards = resultsRef.current.querySelectorAll('[role="button"]');
      const selectedCard = cards[selectedIndex] as HTMLElement;
      selectedCard?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-brand-green-600 via-brand-green-500 to-brand-green-600 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Gold accent */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-brand-gold-400/20 to-transparent"></div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          {/* Logo/Brand */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <ShieldIcon className="w-7 h-7 text-white" />
              </div>
              <div className="text-white">
                <h1 className="text-2xl font-bold tracking-tight">Supporter 360</h1>
                <p className="text-white/80 text-sm">Shamrock Rovers FC</p>
              </div>
            </div>
          </div>

          {/* Hero text */}
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3">
              Find Your Supporters
            </h2>
            <p className="text-lg text-white/80 max-w-xl mx-auto">
              Search across all systems to access complete supporter profiles, history, and engagement data.
            </p>
          </div>

          {/* Search Input */}
          <div className="max-w-2xl mx-auto">
            <div className="relative group">
              <div className="absolute -inset-1 bg-brand-gold-400/30 rounded-2xl blur opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"></div>
              <div className="relative bg-white rounded-xl shadow-xl overflow-hidden">
                <div className="flex items-center">
                  <div className="pl-4 text-slate-400">
                    <SearchIcon className="w-6 h-6" />
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, or phone..."
                    className="flex-1 px-4 py-4 text-lg bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-slate-400"
                    autoFocus
                    aria-label="Search supporters"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="pr-2 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label="Clear search"
                    >
                      <CloseIcon className="w-5 h-5" />
                    </button>
                  )}
                  {isLoading && (
                    <div className="pr-4">
                      <div className="w-5 h-5 border-2 border-brand-green-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  {!isLoading && !searchQuery && (
                    <div className="pr-4 text-xs text-slate-400 hidden sm:block">
                      <kbd className="px-2 py-1 bg-slate-100 rounded font-mono">Ctrl</kbd>
                      <span className="mx-1">+</span>
                      <kbd className="px-2 py-1 bg-slate-100 rounded font-mono">K</kbd>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-700">Filter by Supporter Type</h3>
            {selectedTypes.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                aria-label={`Clear all ${selectedTypes.length} applied filters`}
              >
                Clear all
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Supporter type filters">
            {SUPPORTER_TYPES.map(type => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                aria-pressed={selectedTypes.includes(type)}
                className={`
                  px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200
                  ${selectedTypes.includes(type)
                    ? 'bg-brand-green-500 text-white shadow-sm hover:bg-brand-green-600'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-green-300 hover:text-brand-green-600'
                  }
                `}
              >
                {type}
              </button>
            ))}
          </div>
          {selectedTypes.length > 0 && (
            <p className="mt-3 text-sm text-slate-500" role="status" aria-live="polite">
              {selectedTypes.length} filter{selectedTypes.length > 1 ? 's' : ''} applied
            </p>
          )}
        </div>

        {/* Error State */}
        {error && (
          <Card variant="default" padding="lg" className="bg-red-50 border-red-200 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <CloseIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-red-800">Search Error</h3>
                <p className="text-sm text-red-600">{error.message}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Initial State */}
        {!hasActiveSearch && !error && (
          <Card variant="default" padding="lg" className="text-center animate-fade-in">
            <div className="py-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-brand-green-100 to-brand-green-50 flex items-center justify-center">
                <SearchIcon className="w-10 h-10 text-brand-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Start your search</h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                Enter a name, email, or phone number above to find supporters across all integrated systems.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-slate-400">
                <span className="px-2 py-1 bg-slate-100 rounded">Names</span>
                <span className="px-2 py-1 bg-slate-100 rounded">Email addresses</span>
                <span className="px-2 py-1 bg-slate-100 rounded">Phone numbers</span>
              </div>
            </div>
          </Card>
        )}

        {/* Loading Skeletons */}
        {isLoading && hasActiveSearch && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <ResultCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Results Grid */}
        {!isLoading && hasActiveSearch && results.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4 animate-fade-in">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{total}</span> result{total !== 1 ? 's' : ''} found
              </p>
              <p className="text-xs text-slate-400">
                Use arrow keys to navigate
              </p>
            </div>

            <div ref={resultsRef} className="space-y-3">
              {results.map((result, index) => (
                <ResultCard
                  key={result.supporter_id}
                  result={result}
                  onClick={() => navigate(`/supporters/${result.supporter_id}`)}
                  isSelected={selectedIndex === index}
                  index={index}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="secondary"
                  onClick={() => setPage(p => p + 1)}
                  disabled={isLoading}
                  loading={isLoading}
                >
                  Load more results
                </Button>
              </div>
            )}
          </>
        )}

        {/* No Results */}
        {!isLoading && hasActiveSearch && results.length === 0 && !error && (
          <Card variant="default" padding="lg" className="text-center animate-fade-in">
            <div className="py-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-100 flex items-center justify-center">
                <UserIcon className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No results found</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-4">
                We couldn't find any supporters matching your search criteria.
              </p>
              <div className="text-sm text-slate-400">
                <p>Try:</p>
                <ul className="mt-2 space-y-1">
                  <li>Checking your spelling</li>
                  <li>Using fewer filters</li>
                  <li>Searching by email instead</li>
                </ul>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
