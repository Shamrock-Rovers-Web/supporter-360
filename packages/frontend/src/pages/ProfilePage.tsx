import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSupporterProfile } from '../hooks/useSupporters';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { TimelineTab } from '../components/profile/TimelineTab';

type Tab = 'overview' | 'timeline' | 'purchases' | 'membership' | 'stadium' | 'mailchimp';

export function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { data: profile, isLoading, error } = useSupporterProfile(id || '');

  if (isLoading) {
    return <div className="text-gray-500">Loading profile...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        {error.message}
      </div>
    );
  }

  if (!profile) {
    return <div className="text-gray-500">Profile not found</div>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'purchases', label: 'Purchases' },
    { key: 'membership', label: 'Membership' },
    { key: 'stadium', label: 'Stadium Entry' },
    { key: 'mailchimp', label: 'Mailchimp' },
  ];

  return (
    <div>
      <ProfileHeader profile={profile} />

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6">
          {activeTab === 'timeline' && <TimelineTab supporterId={profile.supporter_id} />}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded">
                <h3 className="font-medium text-gray-700">Last Ticket Order</h3>
                <p className="text-lg font-semibold">
                  {profile.last_ticket_order
                    ? new Date(profile.last_ticket_order.event_time).toLocaleDateString('en-GB')
                    : 'Never'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <h3 className="font-medium text-gray-700">Last Shop Order</h3>
                <p className="text-lg font-semibold">
                  {profile.last_shop_order
                    ? new Date(profile.last_shop_order.event_time).toLocaleDateString('en-GB')
                    : 'Never'}
                </p>
              </div>
            </div>
          )}
          {activeTab !== 'overview' && activeTab !== 'timeline' && (
            <p className="text-gray-500">Coming soon</p>
          )}
        </div>
      </div>
    </div>
  );
}
