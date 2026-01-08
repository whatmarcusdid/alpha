'use client';

import { useRouter } from 'next/navigation';
import { TertiaryButton } from '@/components/ui/TertiaryButton';

interface SelectedProductCardProps {
  planName: string;
  onRemove?: () => void;
}

export function SelectedProductCard({ planName, onRemove }: SelectedProductCardProps) {
  const router = useRouter();

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    } else {
      router.push('/pricing');
    }
  };

  return (
    <div className="rounded-lg border-2 border-[#1B4A41] p-4 mb-6 flex items-center justify-between">
      <div>
        <h3 className="text-lg font-bold leading-relaxed text-[#232521]">
          Genie Maintenance - {planName} Plan
        </h3>
      </div>
      <TertiaryButton onClick={handleRemove}>
        Remove
      </TertiaryButton>
    </div>
  );
}
