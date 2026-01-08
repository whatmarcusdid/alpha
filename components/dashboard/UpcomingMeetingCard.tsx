import { Meeting } from '@/types/user';

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
    <div className="bg-white rounded border border-[rgba(111,121,122,0.4)] p-4 flex flex-col gap-4 items-start">
      {/* Calendar Badge */}
      <div className="bg-[#f2f2f2] flex flex-col h-[66px] w-16 items-center overflow-hidden rounded">
        {/* Month Label - Red Bar */}
        <div className="bg-[#e74c3c] flex h-6 items-center justify-center overflow-hidden px-2 py-1 shrink-0 w-full">
          <p className="font-bold text-[15px] leading-[1.5] tracking-tight text-center text-white uppercase">
            {month}
          </p>
        </div>
        {/* Day Number */}
        <div className="flex-grow flex items-center justify-center overflow-hidden w-full min-h-0">
          <p className="font-bold text-2xl text-[#232521] leading-[1.5] tracking-tight text-center">
            {day}
          </p>
        </div>
      </div>

      {/* Meeting Info */}
      <div className="flex flex-col gap-2 items-start w-full">
        <h4 className="font-bold text-base leading-[1.5] tracking-tight text-[#232521]">
          {meeting.title}
        </h4>
        <p className="font-medium text-[15px] leading-[1.2] tracking-tight text-[#545552]">
          {fullDate}, {time}
        </p>
        <button 
          onClick={() => window.open(meeting.meetingUrl, '_blank')}
          className="font-bold text-base leading-[1.5] text-[#1B4A41] hover:underline underline-offset-2 transition-all"
        >
          View Details
        </button>
      </div>
    </div>
  );
}
