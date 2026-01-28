import React, { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSupporterProfile } from '../hooks/useSupporters';
import { Timeline } from '../components/Timeline';
import { SupporterType, SourceSystem } from '@supporter360/shared';

type Tab = 'timeline' | 'purchases' | 'membership' | 'stadium' | 'mailchimp' | 'admin';

const TABS: { key: Tab; label: string }[] = [
  { key: 'timeline', label: 'Timeline' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'membership', label: 'Membership' },
  { key: 'stadium', label: 'Stadium Entry' },
  { key: 'mailchimp', label: 'Mailchimp' },
  { key: 'admin', label: 'Admin' },
];

const typeColors: Record<SupporterType, string> = {
  'Member': 'bg-blue-100 text-blue-800 border-blue-200',
  'Season Ticket Holder': 'bg-purple-100 text-purple-800 border-purple-200',
  'Ticket Buyer': 'bg-green-100 text-green-800 border-green-200',
  'Shop Buyer': 'bg-orange-100 text-orange-800 border-orange-200',
  'Away Supporter': 'bg-red-100 text-red-800 border-red-200',
  'Staff/VIP': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Unknown': 'bg-gray-100 text-gray-800 border-gray-200',
};

const systemConfig: Record<SourceSystem, { label: string; color: string; icon: string }> = {
  shopify: { label: 'Shopify', color: 'bg-green-100 text-green-800', icon: '🛍️' },
  stripe: { label: 'Stripe', color: 'bg-purple-100 text-purple-800', icon: '💳' },
  gocardless: { label: 'GoCardless', color: 'bg-blue-100 text-blue-800', icon: '🔄' },
  futureticketing: { label: 'Future Ticketing', color: 'bg-orange-100 text-orange-800', icon: '🎫' },
  mailchimp: { label: 'Mailchimp', color: 'bg-pink-100 text-pink-800', icon: '📧' },
};

// Loading skeleton for header
function ProfileHeaderSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-48 mb-3"></div>
          <div className="h-5 bg-gray-200 rounded animate-pulse w-64 mb-2"></div>
          <div className="h-5 bg-gray-200 rounded animate-pulse w-48"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded animate-pulse w-24"></div>
      </div>
    </div>
  );
}

// Loading skeleton for overview cards
function OverviewCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-20 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded animate-pulse w-24"></div>
        </div>
      ))}
    </div>
  );
}

// Overview Card Component
interface OverviewCardProps {
  title: string;
  icon: string;
  value: string | React.ReactNode;
  subtitle?: string;
  color?: string;
}

function OverviewCard({ title, icon, value, subtitle, color = 'bg-white' }: OverviewCardProps) {
  return (
    <div className={`${color} rounded-lg shadow p-4 border border-gray-100`}>
      <div className="flex items-center mb-2">
        <span className="text-xl mr-2" role="img" aria-label="icon">
          {icon}
        </span>
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
      </div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

// Linked ID Chip Component
interface LinkedIdChipProps {
  system: SourceSystem;
  id: string | null | undefined;
}

function LinkedIdChip({ system, id }: LinkedIdChipProps) {
  const config = systemConfig[system];

  if (!id) return null;

  return (
    <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${config.color}`}>
      <span className="mr-1.5">{config.icon}</span>
      <span>{config.label}</span>
      <span className="mx-1.5 text-gray-500">|</span>
      <span className="font-mono text-xs opacity-75">{id.slice(0, 8)}...</span>
    </div>
  );
}

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ProfileErrorBoundary extends React.Component<
  { children: React.ReactNode; supporterId: string; onReset?: () => void },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; supporterId: string; onReset?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <svg
            className="w-12 h-12 text-red-500 mx-auto mb-4"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <h3 className="text-lg font-medium text-red-900 mb-2">Something went wrong</h3>
          <p className="text-red-700 mb-4">
            {this.state.error?.message || 'Failed to load supporter profile'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onReset?.();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function Profile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('timeline');
  const [key, setKey] = useState(0); // Used to reset component on error

  const { data: profile, isLoading, error, refetch } = useSupporterProfile(id || '');

  if (!id) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-medium text-yellow-900 mb-2">Invalid URL</h3>
        <p className="text-yellow-700 mb-4">No supporter ID provided in the URL.</p>
        <Link
          to="/"
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors inline-block"
        >
          Go to search
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <ProfileHeaderSkeleton />
        <OverviewCardsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start">
          <svg
            className="w-6 h-6 text-red-500 mr-3 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-red-900 mb-1">Failed to load profile</h3>
            <p className="text-red-700 mb-4">{error.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try again
              </button>
              <Link
                to="/"
                className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors inline-block"
              >
                Back to search
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <svg
          className="w-16 h-16 text-gray-400 mx-auto mb-4"
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">Supporter not found</h3>
        <p className="text-gray-600 mb-4">
          We couldn't find a supporter with the ID "{id.slice(0, 8)}..."
        </p>
        <Link
          to="/"
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-block"
        >
          Go to search
        </Link>
      </div>
    );
  }

  const formatDate = (date: string | Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: string | Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ProfileErrorBoundary key={key} supporterId={id} onReset={() => setKey(k => k + 1)}>
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-green-600 hover:text-green-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded px-2 py-1 -ml-2"
          aria-label="Go back to previous page"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>

        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {profile.name || 'Unknown Name'}
                </h2>
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${typeColors[profile.supporter_type]}`}
                >
                  {profile.supporter_type}
                </span>
              </div>

              <div className="space-y-2 text-gray-600">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <span className={profile.primary_email ? 'text-gray-900' : 'text-gray-400 italic'}>
                    {profile.primary_email || 'No email on file'}
                  </span>
                </div>
                {profile.phone && (
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    <span>{profile.phone}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  <span className="text-sm font-mono text-gray-500">
                    ID: {profile.supporter_id.slice(0, 8)}...
                  </span>
                </div>
              </div>

              {/* Linked IDs */}
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Linked Accounts
                </p>
                <div className="flex flex-wrap gap-2">
                  <LinkedIdChip system="shopify" id={profile.linked_ids?.shopify} />
                  <LinkedIdChip system="stripe" id={profile.linked_ids?.stripe} />
                  <LinkedIdChip system="gocardless" id={profile.linked_ids?.gocardless} />
                  <LinkedIdChip system="futureticketing" id={profile.linked_ids?.futureticketing} />
                </div>
                {Object.values(profile.linked_ids || {}).every(v => !v) && (
                  <p className="text-sm text-gray-400 italic">No linked accounts</p>
                )}
              </div>

              {/* Flags */}
              {profile.flags?.shared_email && (
                <div className="mt-4 inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                  <svg
                    className="w-4 h-4 mr-1.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Shared Email
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => refetch()}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <OverviewCard
            title="Last Ticket"
            icon="🎫"
            value={formatDate(profile.overview?.last_ticket_order?.event_time) || 'Never'}
            color="bg-green-50"
          />
          <OverviewCard
            title="Last Shop Order"
            icon="🛍️"
            value={formatDate(profile.overview?.last_shop_order?.event_time) || 'Never'}
            subtitle={
              profile.overview?.last_shop_order?.amount
                ? `€${Number(profile.overview.last_shop_order.amount).toFixed(2)}`
                : undefined
            }
            color="bg-orange-50"
          />
          <OverviewCard
            title="Membership"
            icon="⭐"
            value={profile.overview?.membership?.status || 'None'}
            subtitle={
              profile.overview?.membership?.tier
                ? `${profile.overview.membership.tier} - ${profile.overview.membership.cadence || ''}`
                : undefined
            }
            color={
              profile.overview?.membership?.status === 'Active'
                ? 'bg-blue-50'
                : 'bg-gray-50'
            }
          />
          <OverviewCard
            title="Last Stadium Entry"
            icon="🏟️"
            value={formatDate(profile.overview?.last_stadium_entry?.event_time) || 'Never'}
            color="bg-purple-50"
          />
          <OverviewCard
            title="Mailchimp"
            icon="📧"
            value={
              profile.overview?.mailchimp && profile.overview.mailchimp.length > 0
                ? `${profile.overview.mailchimp.length} audience${profile.overview.mailchimp.length > 1 ? 's' : ''}`
                : 'None'
            }
            subtitle={
              profile.overview?.mailchimp && profile.overview.mailchimp.length > 0
                ? profile.overview.mailchimp.map(a => a.tags.length).reduce((a, b) => a + b, 0) + ' tags'
                : undefined
            }
            color="bg-pink-50"
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex min-w-max" role="tablist" aria-label="Profile sections">
              {TABS.map((tab, index) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-inset focus:ring-offset-0
                    ${
                      activeTab === tab.key
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  aria-controls={`${tab.key}-panel`}
                  id={`${tab.key}-tab`}
                  tabIndex={activeTab === tab.key ? 0 : -1}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'timeline' && (
              <div id="timeline-panel" role="tabpanel" aria-labelledby="timeline-tab" tabIndex={0}>
                <Timeline supporterId={profile.supporter_id} />
              </div>
            )}
            {activeTab === 'purchases' && (
              <div id="purchases-panel" role="tabpanel" aria-labelledby="purchases-tab" tabIndex={0}>
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">Purchases</h3>
                <p className="text-gray-500">Purchase history will be displayed here.</p>
              </div>
              </div>
            )}
            {activeTab === 'membership' && (
              <div id="membership-panel" role="tabpanel" aria-labelledby="membership-tab" tabIndex={0} className="text-center py-12">
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
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Membership Details</h3>
                <p className="text-gray-500">Membership information will be displayed here.</p>
              </div>
            )}
            {activeTab === 'stadium' && (
              <div id="stadium-panel" role="tabpanel" aria-labelledby="stadium-tab" tabIndex={0} className="text-center py-12">
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">Stadium Entry History</h3>
                <p className="text-gray-500">Stadium entry records will be displayed here.</p>
              </div>
            )}
            {activeTab === 'mailchimp' && (
              <div id="mailchimp-panel" role="tabpanel" aria-labelledby="mailchimp-tab" tabIndex={0} className="text-center py-12">
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Mailchimp Activity</h3>
                <p className="text-gray-500">Email engagement and tags will be displayed here.</p>
              </div>
            )}
            {activeTab === 'admin' && (
              <div id="admin-panel" role="tabpanel" aria-labelledby="admin-tab" tabIndex={0} className="text-center py-12">
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Admin Actions</h3>
                <p className="text-gray-500 mb-4">Administrative functions for this supporter.</p>
                <Link
                  to="/admin"
                  className="inline-block px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                >
                  Go to Admin Panel
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProfileErrorBoundary>
  );
}
