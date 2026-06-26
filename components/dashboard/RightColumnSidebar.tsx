import WhileYouWaitCard from '@/components/dashboard/WhileYouWaitCard';
import { LeaveAReviewCard } from '@/components/dashboard/LeaveAReviewCard';
import { PastAuditsCard } from '@/components/dashboard/PastAuditsCard';

type Props = {
  deliveryStatus: 'in_progress' | 'delivered' | null;
  googleReviewUrl: string | null;
  userId: string;
};

export function RightColumnSidebar({
  deliveryStatus,
  googleReviewUrl,
  userId,
}: Props) {
  if (deliveryStatus == null) return null;

  return (
    <div className="flex flex-col gap-6">
      {deliveryStatus === 'in_progress' && <WhileYouWaitCard />}
      <PastAuditsCard userId={userId} />
      {deliveryStatus === 'delivered' && googleReviewUrl != null && (
        <LeaveAReviewCard googleReviewUrl={googleReviewUrl} />
      )}
    </div>
  );
}
