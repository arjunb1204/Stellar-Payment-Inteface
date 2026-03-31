"use client";

import React from "react";

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  bgClass?: string;
  isFullScreen?: boolean;
}

/**
 * Reusable Bottom Sheet Overlay Component
 * 
 * Specifically engineered to bypass iOS/Android virtual keyboard layout tearing
 * by using an `absolute inset-0` rigid bounding box preventing viewport `vh` implosion.
 */
export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  bgClass = "bg-[#1e1e20]",
  isFullScreen = false,
}: BottomSheetProps) {
  return (
    <div
      className={`absolute inset-0 z-40 flex flex-col justify-end pointer-events-none overflow-hidden ${
        isOpen ? "visible" : "invisible delay-300"
      }`}
    >
      <div
        className={`w-full ${bgClass} ${isFullScreen ? "h-full rounded-none" : "rounded-t-3xl"} shadow-[0_-20px_60px_rgba(0,0,0,0.8)] pointer-events-auto transition-transform duration-300 transform flex flex-col shrink min-h-0 ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Render Header Only if Title exists */}
        {title && (
          <div className="flex justify-between items-center p-4 border-b border-zinc-800/50 shrink-0">
            <h3 className="font-semibold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white bg-zinc-800/50 rounded-full transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Render Body Children natively wrapped in scrolling rules (if provided by children) */}
        {children}
      </div>
    </div>
  );
}
