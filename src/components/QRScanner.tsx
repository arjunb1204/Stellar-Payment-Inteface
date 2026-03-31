"use client";

import React, { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

export function QRScanner({ onScan }: { onScan: (text: string) => void }) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let html5QrcodeScanner: Html5QrcodeScanner | null = null;
    
    try {
      html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
        false
      );
      
      html5QrcodeScanner.render(
        (decodedText) => {
          onScan(decodedText);
          html5QrcodeScanner?.pause(true); // stop scanning immediately
        },
        (errorMessage) => {
          // just ignore internal decode failures 
        }
      );
    } catch (e: any) {
      setError(e.message);
    }

    return () => {
      try {
        html5QrcodeScanner?.clear().catch(() => {});
      } catch (e) {
        // ignore clear error
      }
    };
  }, [onScan]);

  return (
    <div className="flex flex-col items-center justify-center p-4 h-full">
      <h3 className="text-xl font-bold text-white mb-6">Scan QR Code</h3>
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      <div id="qr-reader" className="w-full max-w-sm rounded-xl overflow-hidden bg-zinc-900 border border-zinc-700/50"></div>
      <p className="mt-6 text-sm text-zinc-400 text-center max-w-xs">Scan a Stellar address or SEP-0007 payment request URI.</p>
    </div>
  );
}
