"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * App-level PIN hook.
 * Uses localStorage to store a simply encoded PIN to mimic a secure enclave.
 * In a real Web3 app, this would be integrated with wallet-level signing or standard Session Keys.
 */
export function usePin() {
  const [isPinSet, setIsPinSet] = useState<boolean | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const storedPin = localStorage.getItem("dapp_pin");
    setIsPinSet(!!storedPin);
  }, []);

  const setPin = useCallback((pin: string) => {
    if (pin.length !== 6) return false;
    localStorage.setItem("dapp_pin", btoa(pin)); // Base64 encoding for simple obfuscation MVP
    setIsPinSet(true);
    setIsUnlocked(true);
    return true;
  }, []);

  const verifyPin = useCallback((pin: string) => {
    const storedPin = localStorage.getItem("dapp_pin");
    if (storedPin && storedPin === btoa(pin)) {
      setIsUnlocked(true);
      return true;
    }
    return false;
  }, []);

  const lock = useCallback(() => {
    setIsUnlocked(false);
  }, []);

  const resetPin = useCallback(() => {
    localStorage.removeItem("dapp_pin");
    setIsPinSet(false);
    setIsUnlocked(false);
  }, []);

  return { isPinSet, isUnlocked, setPin, verifyPin, lock, resetPin };
}
