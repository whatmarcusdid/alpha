'use client';

import { useRouter } from 'next/navigation';

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
        <h3 className="font-semibold text-[#232521]">
          Genie Maintenance - {planName} Plan
        </h3>
      </div>
      <button
        onClick={handleRemove}
        className="text-sm hover:opacity-70 transition-opacity"
        aria-label="Remove plan"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="23" viewBox="0 0 17 23" fill="none">
          <path d="M14.7 2.6625H11.8125V2.025C11.8125 0.9 10.9125 0 9.7875 0H6.9C5.775 0 4.875 0.9 4.875 2.025V2.6625H1.9875C0.9 2.6625 0 3.5625 0 4.65V5.775C0 6.6 0.4875 7.275 1.2 7.575L1.8 20.55C1.875 21.7875 2.85 22.725 4.0875 22.725H12.525C13.7625 22.725 14.775 21.75 14.8125 20.55L15.4875 7.5375C16.2 7.2375 16.6875 6.525 16.6875 5.7375V4.6125C16.6875 3.5625 15.7875 2.6625 14.7 2.6625ZM6.6 2.025C6.6 1.8375 6.75 1.6875 6.9375 1.6875H9.825C10.0125 1.6875 10.1625 1.8375 10.1625 2.025V2.6625H6.6375V2.025H6.6ZM1.725 4.65C1.725 4.5 1.8375 4.35 2.025 4.35H14.7C14.85 4.35 15 4.4625 15 4.65V5.775C15 5.925 14.8875 6.075 14.7 6.075H2.025C1.875 6.075 1.725 5.9625 1.725 5.775V4.65ZM12.5625 21.0375H4.1625C3.825 21.0375 3.5625 20.775 3.5625 20.475L2.9625 7.7625H13.8L13.2 20.475C13.1625 20.775 12.9 21.0375 12.5625 21.0375Z" fill="#545552"/>
          <path d="M8.3625 11.5127C7.9125 11.5127 7.5 11.8877 7.5 12.3752V17.1377C7.5 17.5877 7.875 18.0002 8.3625 18.0002C8.8125 18.0002 9.225 17.6252 9.225 17.1377V12.3752C9.225 11.8877 8.8125 11.5127 8.3625 11.5127Z" fill="#545552"/>
          <path d="M11.3627 12.2626C10.8752 12.2251 10.5002 12.5626 10.4627 13.0501L10.2377 16.3501C10.2002 16.8001 10.5377 17.2126 11.0252 17.2501C11.0627 17.2501 11.0627 17.2501 11.1002 17.2501C11.5502 17.2501 11.9252 16.9126 11.9252 16.4626L12.1502 13.1626C12.1502 12.6751 11.8127 12.3001 11.3627 12.2626Z" fill="#545552"/>
          <path d="M5.32476 12.2626C4.87476 12.3001 4.49976 12.7126 4.53726 13.1626L4.79976 16.4626C4.83726 16.9126 5.21226 17.2501 5.62476 17.2501C5.66226 17.2501" />
        </svg>
      </button>
    </div>
  );
}
