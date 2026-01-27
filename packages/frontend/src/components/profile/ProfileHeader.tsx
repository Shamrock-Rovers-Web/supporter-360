import { SupporterProfile } from '@supporter360/shared';

interface ProfileHeaderProps {
  profile: SupporterProfile;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {profile.name || 'Unknown Name'}
          </h2>
          <p className="text-gray-600">{profile.primary_email || 'No email'}</p>
          {profile.phone && (
            <p className="text-gray-600">{profile.phone}</p>
          )}
          {profile.emails.length > 1 && (
            <p className="text-sm text-gray-500 mt-1">
              +{profile.emails.length - 1} additional email(s)
            </p>
          )}
        </div>
        <div className="text-right">
          <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            {profile.supporter_type}
          </span>
          {profile.flags.shared_email && (
            <span className="ml-2 inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
              Shared Email
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
