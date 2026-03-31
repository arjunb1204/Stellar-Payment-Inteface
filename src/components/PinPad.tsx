"use client";

import React, { useState, useRef, useEffect } from "react";

interface PinPadProps {
  mode: "setup" | "verify";
  onSubmit: (pin: string) => void;
  error?: string | null;
}

export function PinPad({ mode, onSubmit, error }: PinPadProps) {
  const [pin, setPin] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "").substring(0, 6);
    setPin(value);
    
    if (value.length === 6) {
      onSubmit(value);
      if (mode === "verify") {
        setPin(""); // Clear on verify to prevent sticking if error
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-stellar-700/30 bg-cosmos-800/60 p-10 text-center backdrop-blur-md shadow-2xl">
      <div className="mb-6 rounded-full bg-stellar-900/50 p-4 ring-1 ring-stellar-600/30">
        <svg
          className="h-8 w-8 text-stellar-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          {mode === "setup" ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          )}
        </svg>
      </div>

      <h3 className="mb-2 text-xl font-bold tracking-tight text-white">
        {mode === "setup" ? "Create UPI PIN" : "Enter UPI PIN"}
      </h3>
      <p className="mb-8 text-sm text-stellar-400/60 max-w-xs">
        {mode === "setup"
          ? "Set a secure 6-digit PIN to lock your balances and authorize transactions."
          : "Enter your 6-digit PIN to unlock your dApp securely."}
      </p>

      {/* Hidden input for capturing native mobile keyboard directly */}
      <input
        ref={inputRef}
        type="password"
        pattern="[0-9]*"
        inputMode="numeric"
        value={pin}
        onChange={handleChange}
        className="absolute h-0 w-0 opacity-0"
        maxLength={6}
        aria-hidden="true"
      />

      {/* Visual PIN Dots */}
      <div 
        className="mb-8 flex cursor-text justify-center gap-3"
        onClick={() => inputRef.current?.focus()}
      >
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 transition-all duration-300 ${
              pin.length > i
                ? "border-stellar-500 bg-stellar-500/20 shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                : "border-stellar-800 bg-stellar-900/30"
            }`}
          >
            {pin.length > i && (
              <span className="h-3 w-3 animate-pulse rounded-full bg-stellar-300" />
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="mb-4 animate-pulse text-sm font-medium text-red-400">{error}</p>
      )}

      {/* Simulated Keypad for Desktop environments or fallback */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, "clear", 0, "del"].map((key) => (
          <button
            key={key}
            onClick={() => {
              if (key === "clear") setPin("");
              else if (key === "del") setPin((p) => p.slice(0, -1));
              else if (pin.length < 6) {
                const newPin = pin + key;
                setPin(newPin);
                if (newPin.length === 6) {
                  onSubmit(newPin);
                  if (mode === "verify") setPin("");
                }
              }
            }}
            className="flex h-12 w-16 items-center justify-center rounded-xl bg-cosmos-900/50 text-xl font-medium text-stellar-200 transition-all hover:bg-stellar-800/40 active:scale-95"
          >
            {key === "clear" ? (
              <span className="text-xs text-stellar-500">C</span>
            ) : key === "del" ? (
              <svg className="h-5 w-5 text-stellar-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
              </svg>
            ) : (
              key
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
