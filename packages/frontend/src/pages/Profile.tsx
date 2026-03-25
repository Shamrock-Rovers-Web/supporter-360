import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSupporterProfile } from '../hooks/useSupporters';
import { Timeline } from '../components/Timeline';
import { SupporterType, SourceSystem } from '@supporter360/shared';
import { Badge, getSupporterTypeBadgeVariant, StatusBadge } from '../components/ui/Badge';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';

type Tab = 'timeline' | 'purchases' | 'membership' | 'stadium' | 'mailchimp' | 'admin';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'timeline', label: 'Timeline', icon: '📋' },
  { key: 'purchases', label: 'Purchases', icon: '🛒' },
  { key: 'membership', label: 'Membership', icon: '⭐' },
  { key: 'stadium', label: 'Stadium Entry', icon: '🏟️' },
  { key: 'mailchimp', label: 'Mailchimp', icon: '📧' },
  { key: 'admin', label: 'Admin', icon: '⚙️' },
];

const systemConfig: Record<SourceSystem, { label: string; color: string; icon: string; bgClass: string }> = {
  shopify: { label: 'Shopify', color: 'text-green-700', icon: '🛍️', bgClass: 'bg-green-50 border-green-200' },
  stripe: { label: 'Stripe', color: 'text-purple-700', icon: '💳', bgClass: 'bg-purple-50 border-purple-200' },
  gocardless: { label: 'GoCardless', color: 'text-blue-700', icon: '🔄', bgClass: 'bg-blue-50 border-blue-200' },
  futureticketing: { label: 'Future Ticketing', color: 'text-orange-700', icon: '🎫', bgClass: 'bg-orange-50 border-orange-200' },
  mailchimp: { label: 'Mailchimp', color: 'text-pink-700', icon: '📧', bgClass: 'bg-pink-50 border-pink-200' },
};

// Premium Avatar Component
interface AvatarProps {
  name: string;
  size?: 'md' | 'lg' | 'xl';
}

function Avatar({ name, size = 'lg' }: AvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  const sizeClasses = {
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        rounded-full
        bg-gradient-to-br from-brand-green-400 to-brand-green-600
        text-white font-bold
        flex items-center justify-center
        shadow-lg ring-4 ring-white
      `}
    >
      {initials}
    </div>
  );
}

// Loading skeleton for header
function ProfileHeaderSkeleton() {
  return (
    <Card variant="elevated" className="mb-6">
      <div className="flex items-start gap-6">
        <div className="w-24 h-24 bg-slate-200 rounded-full animate-pulse" />
        <div className="flex-1 pt-2">
          <div className="h-8 bg-slate-200 rounded animate-pulse w-48 mb-3" />
          <div className="h-5 bg-slate-200 rounded animate-pulse w-64 mb-2" />
          <div className="h-5 bg-slate-200 rounded animate-pulse w-48" />
        </div>
      </div>
    </Card>
  );
}

// Loading skeleton for overview cards
function OverviewCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <div className="h-4 bg-slate-200 rounded animate-pulse w-20 mb-3" />
          <div className="h-6 bg-slate-200 rounded animate-pulse w-24" />
        </Card>
      ))}
    </div>
  );
}

// Premium Overview Card Component
interface OverviewCardProps {
  title: string;
  icon: string;
  value: string | React.ReactNode;
  subtitle?: string;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'muted';
}

function OverviewCard({ title, icon, value, subtitle, variant = 'default' }: OverviewCardProps) {
  const variantClasses = {
    default: 'bg-white border-slate-200',
    success: 'bg-emerald-50 border-emerald-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200',
    muted: 'bg-slate-50 border-slate-200',
  };

  const iconBgClasses = {
    default: 'bg-slate-100',
    success: 'bg-emerald-100',
    warning: 'bg-amber-100',
    info: 'bg-blue-100',
    muted: 'bg-slate-100',
  };

  return (
    <Card
      variant="outlined"
      className={`${variantClasses[variant]} hover:shadow-md transition-all duration-200`}
      padding="md"
    >
      <div className="flex items-start gap-3">
        <div className={`${iconBgClasses[variant]} p-2.5 rounded-lg`}>
          <span className="text-xl" role="img" aria-label={title}>
            {icon}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
            {title}
          </p>
          <div className="text-base font-semibold text-slate-900 truncate">{value}</div>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

// Linked Account Chip Component
interface LinkedAccountChipProps {
  system: SourceSystem;
  id: string | null | undefined;
}

function LinkedAccountChip({ system, id }: LinkedAccountChipProps) {
  const config = systemConfig[system];

  if (!id) return null;

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-2 rounded-lg border
        ${config.bgClass}
        transition-all hover:shadow-sm
      `}
    >
      <span className="text-base">{config.icon}</span>
      <div className="flex flex-col">
        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
        <span className="font-mono text-xs text-slate-500">
          {id.length > 12 ? `${id.slice(0, 8)}...` : id}
        </span>
      </div>
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
  constructor(props: {
    children: React.ReactNode;
    supporterId: string;
    onReset?: () => void;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card variant="outlined" className="border-red-200 bg-red-50">
          <div className="text-center py-8">
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
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Something went wrong
            </h3>
            <p className="text-red-700 mb-4">
              {this.state.error?.message || 'Failed to load supporter profile'}
            </p>
            <Button
              variant="danger"
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onReset?.();
              }}
            >
              Try again
            </Button>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Premium Profile Header Component
interface PremiumProfileHeaderProps {
  profile: NonNullable<ReturnType<typeof useSupporterProfile>['data']>;
  onRefresh: () => void;
}

function PremiumProfileHeader({ profile, onRefresh }: PremiumProfileHeaderProps) {
  const formatDate = (date: string | Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const linkedAccountsCount = Object.values(profile.linked_ids || {}).filter(Boolean).length;

  return (
    <Card variant="elevated" className="mb-6 overflow-visible">
      {/* Banner gradient */}
      <div className="h-24 bg-gradient-to-r from-brand-green-500 via-brand-green-400 to-brand-gold-400 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-6" />

      <div className="flex flex-col lg:flex-row lg:items-end gap-6">
        {/* Avatar */}
        <div className="-mt-16 relative z-10">
          <Avatar name={profile.name || ''} size="xl" />
          {profile.supporter_type !== 'Unknown' && (
            <div className="absolute -bottom-1 -right-1">
              <div className="w-6 h-6 bg-brand-gold-400 rounded-full flex items-center justify-center shadow-md">
                <span className="text-xs">✓</span>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 pt-2 lg:pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {profile.name || 'Unknown Name'}
            </h1>
            <Badge
              variant={getSupporterTypeBadgeVariant(profile.supporter_type)}
              size="lg"
            >
              {profile.supporter_type}
            </Badge>
            {profile.flags?.shared_email && (
              <Badge variant="warning" size="md">
                Shared Email
              </Badge>
            )}
          </div>

          {/* Contact Info */}
          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-slate-400"
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
              <span className={profile.primary_email ? 'text-slate-900' : 'text-slate-400 italic'}>
                {profile.primary_email || 'No email on file'}
              </span>
            </div>
            {profile.phone && (
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-slate-400"
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
            <div className="flex items-center gap-2 text-slate-400">
              <svg
                className="w-4 h-4"
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
              <span className="font-mono text-xs">{profile.supporter_id.slice(0, 8)}...</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <IconButton
            variant="secondary"
            icon={
              <svg
                className="w-4 h-4"
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
            }
            aria-label="Refresh profile"
            onClick={onRefresh}
          />
        </div>
      </div>

      {/* Linked Accounts */}
      {linkedAccountsCount > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
            Linked Accounts ({linkedAccountsCount})
          </p>
          <div className="flex flex-wrap gap-2">
            <LinkedAccountChip system="shopify" id={profile.linked_ids?.shopify} />
            <LinkedAccountChip system="stripe" id={profile.linked_ids?.stripe} />
            <LinkedAccountChip system="gocardless" id={profile.linked_ids?.gocardless} />
            <LinkedAccountChip system="futureticketing" id={profile.linked_ids?.futureticketing} />
          </div>
        </div>
      )}
    </Card>
  );
}

// Overview Section Component
interface OverviewSectionProps {
  profile: NonNullable<ReturnType<typeof useSupporterProfile>['data']>;
}

function OverviewSection({ profile }: OverviewSectionProps) {
  const formatDate = (date: string | Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const membershipStatus = profile.overview?.membership?.status;
  const membershipVariant = membershipStatus === 'Active' ? 'success' : 'muted';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <OverviewCard
        title="Last Ticket"
        icon="🎫"
        value={formatDate(profile.overview?.last_ticket_order?.event_time)}
        variant={profile.overview?.last_ticket_order ? 'info' : 'muted'}
      />
      <OverviewCard
        title="Last Shop Order"
        icon="🛍️"
        value={formatDate(profile.overview?.last_shop_order?.event_time)}
        subtitle={
          profile.overview?.last_shop_order?.amount
            ? `€${Number(profile.overview.last_shop_order.amount).toFixed(2)}`
            : undefined
        }
        variant={profile.overview?.last_shop_order ? 'default' : 'muted'}
      />
      <OverviewCard
        title="Membership"
        icon="⭐"
        value={
          <div className="flex items-center gap-2">
            <span>{profile.overview?.membership?.status || 'None'}</span>
            {membershipStatus === 'Active' && (
              <StatusBadge variant="success" size="sm" pulse>
                Active
              </StatusBadge>
            )}
          </div>
        }
        subtitle={
          profile.overview?.membership?.tier
            ? `${profile.overview.membership.tier}${profile.overview.membership.cadence ? ` - ${profile.overview.membership.cadence}` : ''}`
            : undefined
        }
        variant={membershipVariant}
      />
      <OverviewCard
        title="Stadium Entry"
        icon="🏟️"
        value={formatDate(profile.overview?.last_stadium_entry?.event_time)}
        variant={profile.overview?.last_stadium_entry ? 'success' : 'muted'}
      />
    </div>
  );
}

// Enhanced Tab Panel Component
interface TabPanelProps {
  activeTab: Tab;
  supporterId: string;
}

function TabPanel({ activeTab, supporterId }: TabPanelProps) {
  const renderPlaceholder = (title: string, icon: string, description: string) => (
    <div className="text-center py-16">
      <div className="w-20 h-20 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
        <span className="text-3xl">{icon}</span>
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 max-w-md mx-auto">{description}</p>
    </div>
  );

  switch (activeTab) {
    case 'timeline':
      return <Timeline supporterId={supporterId} />;
    case 'purchases':
      return renderPlaceholder(
        'Purchases',
        '🛒',
        'Purchase history from Shopify and Future Ticketing will be displayed here.'
      );
    case 'membership':
      return renderPlaceholder(
        'Membership Details',
        '⭐',
        'Membership information including payment history and benefits will be displayed here.'
      );
    case 'stadium':
      return renderPlaceholder(
        'Stadium Entry History',
        '🏟️',
        'Records of stadium entry scans from Future Ticketing will be displayed here.'
      );
    case 'mailchimp':
      return renderPlaceholder(
        'Mailchimp Activity',
        '📧',
        'Email engagement, audience membership, and tags will be displayed here.'
      );
    case 'admin':
      return (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">⚙️</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Admin Actions</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Administrative functions for this supporter record.
          </p>
          <Link to="/admin">
            <Button variant="secondary">Go to Admin Panel</Button>
          </Link>
        </div>
      );
    default:
      return null;
  }
}

// Main Profile Component
export function Profile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('timeline');
  const [key, setKey] = useState(0);

  const { data: profile, isLoading, error, refetch } = useSupporterProfile(id || '');

  if (!id) {
    return (
      <Card variant="outlined" className="border-amber-200 bg-amber-50">
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold text-amber-900 mb-2">Invalid URL</h3>
          <p className="text-amber-700 mb-4">No supporter ID provided in the URL.</p>
          <Link to="/">
            <Button variant="gold">Go to search</Button>
          </Link>
        </div>
      </Card>
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
      <Card variant="outlined" className="border-red-200 bg-red-50">
        <div className="flex items-start gap-4">
          <svg
            className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5"
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
            <h3 className="text-lg font-semibold text-red-900 mb-1">Failed to load profile</h3>
            <p className="text-red-700 mb-4">{error.message}</p>
            <div className="flex gap-3">
              <Button variant="danger" onClick={() => refetch()}>
                Try again
              </Button>
              <Link to="/">
                <Button variant="secondary">Back to search</Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card variant="outlined" className="border-slate-200 bg-slate-50">
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 text-slate-300 mx-auto mb-4"
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
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Supporter not found</h3>
          <p className="text-slate-600 mb-4">
            We couldn't find a supporter with the ID "{id.slice(0, 8)}..."
          </p>
          <Link to="/">
            <Button variant="primary">Go to search</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <ProfileErrorBoundary key={key} supporterId={id} onReset={() => setKey((k) => k + 1)}>
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-brand-green-600 hover:text-brand-green-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2 rounded-lg px-2 py-1 -ml-2"
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

        {/* Premium Profile Header */}
        <PremiumProfileHeader profile={profile} onRefresh={() => refetch()} />

        {/* Overview Cards */}
        <OverviewSection profile={profile} />

        {/* Tabbed Content */}
        <Card variant="elevated" padding="none">
          {/* Tab Navigation */}
          <div className="border-b border-slate-200 overflow-x-auto">
            <nav
              className="flex min-w-max"
              role="tablist"
              aria-label="Profile sections"
            >
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`
                      flex items-center gap-2 px-5 py-4 border-b-2 font-medium text-sm
                      whitespace-nowrap transition-all duration-200
                      focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-inset
                      ${
                        isActive
                          ? 'border-brand-green-500 text-brand-green-600 bg-brand-green-50/50'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }
                    `}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`${tab.key}-panel`}
                    id={`${tab.key}-tab`}
                    tabIndex={isActive ? 0 : -1}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            <div
              id={`${activeTab}-panel`}
              role="tabpanel"
              aria-labelledby={`${activeTab}-tab`}
              tabIndex={0}
            >
              <TabPanel activeTab={activeTab} supporterId={profile.supporter_id} />
            </div>
          </div>
        </Card>
      </div>
    </ProfileErrorBoundary>
  );
}
