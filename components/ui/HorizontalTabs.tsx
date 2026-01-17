'use client';

import { useState } from 'react';

export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

interface HorizontalTabsProps {
  tabs: TabItem[];
  activeTabId: string;
  onChange: (tabId: string) => void;
  className?: string;
}

/**
 * HorizontalTabs - Navigation tabs component for switching between different views
 * Used in the Support Hub and other dashboard pages
 */
export default function HorizontalTabs({
  tabs,
  activeTabId,
  onChange,
  className = '',
}: HorizontalTabsProps) {
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);

  const getTabStyles = (tabId: string, disabled?: boolean) => {
    const isActive = tabId === activeTabId;
    const isHovered = tabId === hoveredTabId && !disabled && !isActive;

    // Base styles
    let styles = `
      flex items-center justify-center 
      px-4 py-2 
      rounded-tl-md rounded-tr-md
      border-b-[3px] border-solid
      cursor-pointer
      transition-colors
      font-semibold text-[14px] leading-[1.5] tracking-[-0.14px] text-center
    `;

    // State-specific styles
    if (disabled) {
      styles += ` 
        border-[#dadada]
        text-[#737373]
        cursor-not-allowed
        opacity-60
      `;
    } else if (isActive) {
      styles += `
        bg-[#FAF9F5]
        border-[#1B4A41]
        text-[#1B4A41]
      `;
    } else if (isHovered) {
      styles += `
        bg-[#FAF9F5]
        border-[#dadada]
        text-[#262626]
      `;
    } else {
      // Default state
      styles += `
        border-[#dadada]
        text-[#262626]
        hover:bg-[#FAF9F5]
      `;
    }

    return styles;
  };

  const handleTabClick = (tabId: string, disabled?: boolean) => {
    if (!disabled && tabId !== activeTabId) {
      onChange(tabId);
    }
  };

  return (
    <div className={`flex items-start gap-0 border-0 ${className}`} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === activeTabId}
          aria-disabled={tab.disabled}
          tabIndex={tab.disabled ? -1 : 0}
          className={getTabStyles(tab.id, tab.disabled)}
          onClick={() => handleTabClick(tab.id, tab.disabled)}
          onMouseEnter={() => !tab.disabled && setHoveredTabId(tab.id)}
          onMouseLeave={() => setHoveredTabId(null)}
          disabled={tab.disabled}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
