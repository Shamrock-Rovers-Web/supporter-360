import { Link } from 'react-router-dom';
import { SearchResult } from '@supporter360/shared';

interface SearchResultCardProps {
  result: SearchResult;
}

const typeColors: Record<string, string> = {
  'Member': 'bg-blue-100 text-blue-800',
  'Season Ticket Holder': 'bg-purple-100 text-purple-800',
  'Ticket Buyer': 'bg-green-100 text-green-800',
  'Shop Buyer': 'bg-orange-100 text-orange-800',
  'Away Supporter': 'bg-red-100 text-red-800',
  'Unknown': 'bg-gray-100 text-gray-800',
};

export function SearchResultCard({ result }: SearchResultCardProps) {
  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-GB');
  };

  return (
    <Link
      to={`/supporters/${result.supporter_id}`}
      className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg text-gray-900">
            {result.name || 'Unknown Name'}
          </h3>
          <p className="text-gray-600">{result.email || 'No email'}</p>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded ${typeColors[result.supporter_type] || typeColors.Unknown}`}>
          {result.supporter_type}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-4 text-sm text-gray-600">
        <div>
          <span className="font-medium">Last Ticket:</span>{' '}
          {formatDate(result.last_ticket_order_date)}
        </div>
        <div>
          <span className="font-medium">Last Shop:</span>{' '}
          {formatDate(result.last_shop_order_date)}
        </div>
        <div>
          <span className="font-medium">Membership:</span>{' '}
          {result.membership_status || 'Unknown'}
        </div>
      </div>
    </Link>
  );
}
