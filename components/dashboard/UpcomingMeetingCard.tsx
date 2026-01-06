import { Meeting } from '@/types/user';
import { TertiaryButton } from '@/components/ui/TertiaryButton';

interface UpcomingMeetingCardProps {
  meeting: Meeting;
}

export function UpcomingMeetingCard({ meeting }: UpcomingMeetingCardProps) {
  const date = meeting.date.toDate();

  const day = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    timeZone: 'America/New_York',
  }).format(date);

  const month = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'America/New_York',
  }).format(date);

  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  }).format(date);
  
  const fullDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  }).format(date);

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="text-center bg-[#FAF9F5] rounded-md p-3 border border-gray-200">
          <p className="text-xs font-semibold text-gray-600 uppercase">{month}</p>
          <p className="text-2xl font-bold text-[#232521]">{day}</p>
        </div>
        <div>
          <h4 className="font-semibold text-[#232521]">{meeting.title}</h4>
          <p className="text-sm text-gray-600">
            {fullDate} at {time}
          </p>
        </div>
      </div>
      <TertiaryButton href={meeting.meetingUrl} target="_blank">
        Join Meeting
      </TertiaryButton>
    </div>
  );
}
