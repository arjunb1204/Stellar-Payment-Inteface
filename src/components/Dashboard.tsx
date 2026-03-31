"use client";

import React, { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { usePin } from "@/hooks/usePin";
import { TransactionPanel } from "./TransactionPanel";
import { TransactionHistory } from "./TransactionHistory";
import { PinPad } from "./PinPad";
import { QRScanner } from "./QRScanner";
import { WalletConnect } from "./WalletConnect";
import { BottomSheet } from "./BottomSheet";
import QRCode from "react-qr-code";
import { truncateAddress } from "@/lib/stellar";

// Placeholder icons (SVG)
const Icons = {
  Scan: () => <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>,
  Contacts: () => <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
  UPI: () => <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364M16.5 12V8.25" /></svg>,
  Bank: () => <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>,
  Receive: () => <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" /></svg>,
};

export function Dashboard() {
  const { isConnected, publicKey, balance } = useWallet();
  const { isPinSet, isUnlocked, setPin, verifyPin } = usePin();
  const [pinError, setPinError] = useState<string | null>(null);
  const [activeSheet, setActiveSheet] = useState<"none" | "pay" | "scan" | "address" | "balance" | "request">("none");
  const [scannedData, setScannedData] = useState<{ destination?: string; amount?: string; memo?: string } | null>(null);
  const [addressInput, setAddressInput] = useState("");
  const [requestAmount, setRequestAmount] = useState("");
  const [requestMemo, setRequestMemo] = useState("");

  const qrWrapperRef = React.useRef<HTMLDivElement>(null);

  const requestUri = requestAmount || requestMemo
    ? `web+stellar:pay?destination=${publicKey}${requestAmount ? `&amount=${requestAmount}` : ""}${requestMemo ? `&memo=${encodeURIComponent(requestMemo)}` : ""}`
    : publicKey || "";

  const handleCopyQR = async () => {
    try {
      if (!qrWrapperRef.current) return;
      const svg = qrWrapperRef.current.querySelector("svg");
      if (!svg) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      const size = 300;
      canvas.width = size;
      canvas.height = size;

      img.onload = () => {
        if (!ctx) return;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);

        canvas.toBlob((blob) => {
          if (blob) {
            navigator.clipboard.write([
              new window.ClipboardItem({ "image/png": blob })
            ]).then(() => {
              const btn = document.getElementById("copy-qr-btn");
              if (btn) {
                const orig = btn.innerText;
                btn.innerText = "✓ Copied QR Image!";
                btn.classList.add("text-emerald-400");
                setTimeout(() => {
                  btn.innerText = orig;
                  btn.classList.remove("text-emerald-400");
                }, 2000);
              }
            }).catch(e => console.error("Clipboard write failed:", e));
          }
        }, "image/png");
      };

      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    } catch (e) {
      console.error("Failed to copy QR code image", e);
    }
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addressInput.startsWith("G") && addressInput.length === 56) {
      setScannedData({ destination: addressInput });
      setActiveSheet("pay");
      setAddressInput("");
    }
  };

  const handleScan = (text: string) => {
    // 1. Raw Stellar public key check
    if (text.startsWith("G") && text.length === 56) {
      setScannedData({ destination: text });
      setActiveSheet("pay");
      return;
    }

    // 2. SEP-0007 URI standard check
    if (text.startsWith("web+stellar:pay")) {
      try {
        const url = new URL(text.replace("web+stellar:", "http://"));
        const dest = url.searchParams.get("destination");
        const amt = url.searchParams.get("amount");
        const memo = url.searchParams.get("memo");

        if (dest && dest.startsWith("G")) {
          setScannedData({
            destination: dest,
            amount: amt || undefined,
            memo: memo || undefined,
          });
          setActiveSheet("pay");
          return;
        }
      } catch (e) {
        console.error("Failed to parse SEP-0007 string", e);
      }
    }

    // Fallback error (could add a toast logic here)
    console.log("Unrecognized QR string: ", text);
  };

  // Still checking localStorage
  if (isPinSet === null) return <div className="h-64 animate-pulse rounded-2xl bg-zinc-900" />;

  if (!isConnected) {
    return (
      <div className="flex flex-col h-[85vh] w-full max-w-[400px] mx-auto bg-[#131314] overflow-hidden rounded-[2rem] border-[4px] border-zinc-900 shadow-2xl items-center justify-center p-8 text-center relative">
        <div className="absolute top-10 w-24 h-24 bg-blue-500/20 rounded-full blur-3xl"></div>
        <h1 className="mb-2 text-3xl font-extrabold bg-gradient-to-br from-blue-400 to-indigo-500 bg-clip-text text-transparent relative z-10 leading-tight">Stellar Payment Interface</h1>
        <p className="mb-10 text-sm text-zinc-400 relative z-10 max-w-[250px]">Connect your Web3 wallet to experience the next-gen payment interface natively on the Stellar Testnet.</p>
        <div className="relative z-10 scale-105">
          <WalletConnect />
        </div>
      </div>
    );
  }

  // Set PIN Overlay
  if (isPinSet === false) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
        <div className="animate-in fade-in zoom-in duration-500 w-full max-w-sm">
          <PinPad mode="setup" onSubmit={(pin) => { setPin(pin); setPinError(null); }} />
        </div>
      </div>
    );
  }

  // Verify PIN Overlay
  if (isPinSet === true && !isUnlocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500 w-full max-w-sm">
          <PinPad mode="verify" error={pinError} onSubmit={(pin) => {
            if (!verifyPin(pin)) setPinError("Incorrect PIN.");
            else setPinError(null);
          }} />
        </div>
      </div>
    );
  }

  // GPay Style Home Layout
  return (
    <div className="flex flex-col h-[85vh] min-h-[550px] w-full max-w-[400px] mx-auto bg-[#131314] overflow-hidden rounded-[2rem] border-[4px] border-zinc-900 shadow-2xl relative">

      <div className="pt-4" />

      {/* Wallet Connection / Address Info */}
      <div className="mx-4 mt-2 mb-2 flex justify-center scale-95 origin-top">
        <WalletConnect />
      </div>

      {/* Beautiful Focused Actions Row */}
      <div className="flex justify-between px-5 py-8 mt-2">
        <ActionBtn
          icon={<Icons.Scan />}
          label="Scan QR"
          bgClass="bg-gradient-to-br from-blue-500/20 to-blue-600/5 border border-blue-500/30"
          colorClass="text-blue-400"
          onClick={() => setActiveSheet("scan")}
        />
        <ActionBtn
          icon={<Icons.Contacts />}
          label="Pay"
          bgClass="bg-gradient-to-br from-indigo-500/20 to-indigo-600/5 border border-indigo-500/30"
          colorClass="text-indigo-400"
          onClick={() => setActiveSheet("address")}
        />
        <ActionBtn
          icon={<Icons.Receive />}
          label="Request"
          bgClass="bg-gradient-to-br from-rose-500/20 to-pink-600/5 border border-rose-500/30"
          colorClass="text-rose-400"
          onClick={() => setActiveSheet("request")}
        />
        <ActionBtn
          icon={<Icons.Bank />}
          label="Balance"
          bgClass="bg-gradient-to-br from-emerald-500/20 to-teal-600/5 border border-emerald-500/30"
          colorClass="text-emerald-400"
          onClick={() => setActiveSheet("balance")}
        />
      </div>

      {/* People / History Section */}
      <div className="flex-1 bg-[#1e1e20] rounded-t-3xl p-5 pt-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col min-h-0">
        <h2 className="text-lg font-medium tracking-tight text-white mb-4 px-1">People & Transactions</h2>
        <div className="flex-1 overflow-hidden">
          {/* Injecting our History List here */}
          <TransactionHistory />
        </div>
      </div>

      {/* ─── ACTION OVERLAYS (MODALS) ─────────────────────────────────────────── */}
      
      {/* 1. Send Payment Modal */}
      <BottomSheet 
        isOpen={activeSheet === "pay"} 
        onClose={() => { setActiveSheet("none"); setScannedData(null); }} 
        title="Send Payment"
      >
        <div className="p-4 overflow-y-auto custom-scrollbar shrink min-h-0">
          <TransactionPanel 
             initialDestination={scannedData?.destination}
             initialAmount={scannedData?.amount}
             initialMemo={scannedData?.memo}
             onClose={() => { setActiveSheet("none"); setScannedData(null); }}
          />
        </div>
      </BottomSheet>
      
      {/* 2. QR Scanner Full Modal */}
      <BottomSheet 
        isOpen={activeSheet === "scan"} 
        onClose={() => setActiveSheet("none")} 
        bgClass="bg-zinc-950" 
        isFullScreen
      >
        <div className="flex justify-between items-center p-4 shrink-0">
           <button onClick={() => setActiveSheet("none")} className="p-2 text-zinc-400 hover:text-white bg-zinc-800/50 rounded-full">
             <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
           </button>
        </div>
        <div className="flex-1 min-h-0">
           <QRScanner onScan={handleScan} />
        </div>
      </BottomSheet>

      {/* 3. Address Input Modal */}
      <BottomSheet 
        isOpen={activeSheet === "address"} 
        onClose={() => { setActiveSheet("none"); setAddressInput(""); }} 
        title="Pay to Address" 
        bgClass="bg-[#252528]"
      >
        <form onSubmit={handleAddressSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto shrink min-h-0">
          <div>
            <label htmlFor="manual-address" className="block text-xs font-medium text-zinc-400 mb-2">Enter Stellar Public Key (G...)</label>
            <input id="manual-address" type="text" value={addressInput} onChange={(e) => setAddressInput(e.target.value)} placeholder="GABC..." className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-xl p-3 focus:outline-none focus:border-indigo-500 font-mono tracking-tight" />
          </div>
          <button type="submit" disabled={addressInput.length !== 56 || !addressInput.startsWith("G")} className="mt-2 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold py-3 rounded-xl transition-all">
            Continue
          </button>
        </form>
      </BottomSheet>

      {/* 4. Check Balance Modal */}
      <BottomSheet 
        isOpen={activeSheet === "balance"} 
        onClose={() => setActiveSheet("none")} 
        bgClass="bg-zinc-900 border-t border-zinc-800/80"
      >
        <div className="w-full flex flex-col items-center justify-center p-8 relative shrink min-h-0">
          <button onClick={() => setActiveSheet("none")} className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white bg-zinc-800/50 rounded-full transition-colors">
             <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="mb-4 rounded-full bg-emerald-500/10 p-4 border border-emerald-500/20">
             <Icons.Bank />
          </div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Available Balance</p>
          <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent">
                {balance ? parseFloat(balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "—"}
              </span>
              <span className="text-lg font-medium text-zinc-500">XLM</span>
          </div>
          {!balance && <p className="mt-4 text-xs text-red-400">Account not funded yet.</p>}
        </div>
      </BottomSheet>

      {/* 5. Request XLM Modal */}
      <BottomSheet 
        isOpen={activeSheet === "request"} 
        onClose={() => { setActiveSheet("none"); setRequestAmount(""); setRequestMemo(""); }} 
        title="Receive XLM" 
        bgClass="bg-[#252528]"
      >
        <div className="overflow-y-auto custom-scrollbar px-6 py-6 flex flex-col items-center shrink min-h-0">
          <div ref={qrWrapperRef} className="bg-white p-4 rounded-3xl shadow-xl mb-3 shrink-0">
            <QRCode value={requestUri} size={220} />
          </div>
          <button id="copy-qr-btn" onClick={handleCopyQR} className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider mb-6 transition-colors duration-300 outline-none shrink-0">
            Copy QR Image
          </button>
          
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700/50 rounded-xl py-2 px-4 mb-6 cursor-pointer hover:bg-zinc-800 transition-colors w-full shrink-0 group" onClick={() => navigator.clipboard.writeText(publicKey || "")}>
            <span className="font-mono text-[11px] text-zinc-400 truncate w-full tracking-tighter">{publicKey}</span>
            <svg className="h-5 w-5 text-indigo-400/70 shrink-0 group-hover:text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </div>
          
          <div className="w-full space-y-4 shrink-0 pb-4">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Request Amount (Optional)</label>
              <input type="number" min="0" step="0.1" value={requestAmount} onChange={(e) => setRequestAmount(e.target.value)} placeholder="0.0" className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-xl p-3 focus:outline-none focus:border-indigo-500/50" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Reference Memo (Optional)</label>
              <input type="text" maxLength={28} value={requestMemo} onChange={(e) => setRequestMemo(e.target.value)} placeholder="For coffee..." className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-xl p-3 focus:outline-none focus:border-indigo-500/50" />
            </div>
          </div>
        </div>
      </BottomSheet>
      
      {/* ─── DIMMED BACKDROP ──────────────────────────────────────────────── */}
      {(activeSheet === "pay" || activeSheet === "address" || activeSheet === "balance" || activeSheet === "request") && (
        <div className="absolute inset-0 bg-black/60 z-30 transition-opacity" onClick={() => { setActiveSheet("none"); setScannedData(null); setRequestAmount(""); setRequestMemo(""); }} />
      )}
    </div>
  );
}

// Helper Action Component tailored for the tight 4-button layout
function ActionBtn({ icon, label, bgClass, colorClass, onClick }: { icon: React.ReactNode; label: string; bgClass: string; colorClass: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group outline-none w-[72px]">
      <div className={`h-[60px] w-[60px] flex shrink-0 items-center justify-center rounded-[20px] shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:brightness-110 group-active:scale-95 ${bgClass} ${colorClass}`}>
        {icon}
      </div>
      <span className="text-[11px] sm:text-[12px] text-center text-zinc-300 font-medium leading-tight px-0.5">
        {label}
      </span>
    </button>
  );
}
