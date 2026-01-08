'use client';

import React from 'react';
import { Check } from 'lucide-react';

export type PricingCardVariant = 'current' | 'upgradeable' | 'selected' | 'disabled';

interface PricingCardProps {
  tierName: string;
  price: string;
  features: string[];
  variant?: PricingCardVariant;
  onClick?: () => void;
  className?: string;
  buttonLabel?: string;
}

export function PricingCard({
  tierName,
  price,
  features,
  variant = 'upgradeable',
  onClick,
  className = '',
  buttonLabel,
}: PricingCardProps) {
  const isClickable = variant === 'upgradeable' || variant === 'selected';
  
  const getButtonContent = () => {
    switch (variant) {
      case 'current':
        return {
          text: 'Your Current Plan',
          className: 'bg-[#DADADA] text-[#737373] cursor-not-allowed',
        };
      case 'selected':
        return {
          text: 'Selected',
          className: 'border-2 border-[#232521] text-[#232521] bg-white',
        };
      case 'disabled':
        return {
          text: 'Not Available',
          className: 'bg-gray-200 text-gray-500 cursor-not-allowed',
        };
      default: // upgradeable
        return {
          text: buttonLabel || 'Select Plan',
          className: 'bg-[#9be382] hover:bg-[#8dd370] text-[#1B4A41]',
        };
    }
  };

  const buttonConfig = getButtonContent();

  return (
    <div
      className={`bg-white border border-[rgba(111,121,122,0.4)] rounded-lg p-8 flex flex-col items-center ${
        variant === 'selected' ? 'border-[#9be382] shadow-md' : ''
      } ${isClickable ? 'cursor-pointer hover:border-gray-300' : ''} ${className}`}
      onClick={isClickable ? onClick : undefined}
    >
      {/* Header: Tier Name, Price, Per Year */}
      <div className="flex flex-col gap-2 items-center text-center w-full">
        <h3 className="font-bold text-lg leading-[1.2] tracking-tight text-[#1B4A41]">
          {tierName}
        </h3>
        <p className="font-extrabold text-[32px] leading-[1.2] tracking-tight text-[#232521]">
          ${price}
        </p>
        <p className="text-base leading-[1.5] text-[#232521]">
          Per Year
        </p>
      </div>

      {/* Button */}
      <div className="mt-8 w-full">
        <button
          onClick={(e) => {
            if (isClickable && onClick) {
              e.stopPropagation();
              onClick();
            }
          }}
          disabled={variant === 'current' || variant === 'disabled'}
          className={`w-full px-4 py-1.5 font-bold text-base rounded-full min-h-[40px] transition-colors ${buttonConfig.className}`}
        >
          {buttonConfig.text}
        </button>
      </div>

      {/* Features List */}
      <div className="mt-8 w-full flex flex-col gap-4 py-2">
        {features.map((feature, index) => (
          <div key={index} className="flex gap-4 items-start">
            <div className="shrink-0 w-6 h-6 flex items-center justify-center">
              <Check className="w-6 h-6 text-[#1B4A41]" strokeWidth={2.5} />
            </div>
            <p className="text-base leading-[1.5] text-[#232521] flex-1">
              {feature}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

