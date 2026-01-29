import { useSupporterTimeline } from '../../hooks/useSupporters';
import { Event } from '@supporter360/shared';

interface TimelineTabProps {
  supporterId: string;
}

const eventTypeColors: Record<string, string> = {
  'TicketPurchase': 'border-green-500 bg-green-50',
  'StadiumEntry': 'border-blue-500 bg-blue-50',
  'ShopOrder': 'border-orange-500 bg-orange-50',
  'MembershipEvent': 'border-purple-500 bg-purple-50',
  'PaymentEvent': 'border-yellow-500 bg-yellow-50',
  'EmailClick': 'border-pink-500 bg-pink-50',
};

const eventTypeLabels: Record<string, string> = {
  'TicketPurchase': 'Ticket Purchase',
  'StadiumEntry': 'Stadium Entry',
  'ShopOrder': 'Shop Order',
  'MembershipEvent': 'Membership',
  'PaymentEvent': 'Payment',
  'EmailClick': 'Email Click',
};

export function TimelineTab({ supporterId }: TimelineTabProps) {
  const { data: events, isLoading } = useSupporterTimeline(supporterId);

  if (isLoading) {
    return <div className="text-gray-500">Loading timeline...</div>;
  }

  if (!events || events.length === 0) {
    return <div className="text-gray-500">No events found</div>;
  }

  return (
    <div className="space-y-4">
      {events.map((event: Event) => (
        <div
          key={event.event_id}
          className={`flex items-start p-4 rounded-lg border-l-4 ${eventTypeColors[event.event_type] || 'border-gray-500 bg-gray-50'}`}
        >
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-gray-900">
                  {eventTypeLabels[event.event_type] || event.event_type}
                </h4>
                <p className="text-sm text-gray-500 capitalize">{event.source_system}</p>
              </div>
              <span className="text-sm text-gray-500">
                {new Date(event.event_time).toLocaleString('en-GB')}
              </span>
            </div>
            {event.amount && (
              <p className="mt-1 font-medium">
                €{event.amount.toFixed(2)}
              </p>
            )}
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <details className="mt-2">
                <summary className="text-sm text-gray-600 cursor-pointer">
                  Details
                </summary>
                <pre className="mt-1 text-xs bg-white p-2 rounded overflow-auto">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
