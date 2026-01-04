import { Meeting } from '@/types/user';
import { TertiaryButton } from '@/components/ui/TertiaryButton';

interface UpcomingMeetingCardProps {
  meeting: Meeting;
}

export function UpcomingMeetingCard({ meeting }: UpcomingMeetingCardProps) {
  const meetingDate = (meeting.date as any).toDate();
  const month = meetingDate.toLocaleDateString('en-US', { month: 'short' });
  const day = meetingDate.getDate();
  const fullDate = meetingDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  const time = meetingDate.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });

  return (
    <div className="flex w-[371px] p-4 flex-col items-start gap-4 bg-white rounded-lg border border-[#6F797A]/40">
      {/* Calendar Icon - 64x64 */}
      <div className="flex-shrink-0">
        <div className="w-16 h-16 rounded overflow-hidden bg-white border border-[#6F797A]/40">
          <div className="bg-[#EF4444] text-white text-center py-1">
            <p className="text-[15px] font-bold leading-tight">{month}</p>
          </div>
          <div className="bg-[#F7F6F1] text-center flex items-center justify-center h-10">
            <p className="text-2xl font-bold text-[#232521]">{day}</p>
          </div>
        </div>
      </div>

      {/* Meeting Details */}
      <div className="flex-1 flex flex-col gap-2">
        <h3 className="text-[15px] font-bold text-[#232521] leading-snug">
          {meeting.title}
        </h3>
        
        <p className="text-[13px] text-gray-600 leading-snug">
          {fullDate}, {time}
        </p>

        {meeting.meetingUrl && (
          <TertiaryButton
            href={meeting.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Details
          </TertiaryButton>
        )}
      </div>
    </div>
  );
}
