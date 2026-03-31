"use client";

import { useState, useCallback, useEffect } from "react";
import { getServer } from "@/lib/stellar";

export interface TxRecord {
  id: string;
  type: string;
  amount: string;
  asset_type: string;
  from: string;
  to: string;
  created_at: string;
}

export function useHistory(publicKey: string | null) {
  const [history, setHistory] = useState<TxRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!publicKey) return;
    setIsLoading(true);
    setError(null);
    try {
      const server = getServer();
      
      // Fetch the last 20 payments/transfers involving this account
      const response = await server
        .payments()
        .forAccount(publicKey)
        .order("desc")
        .limit(20)
        .call();

      const records: TxRecord[] = response.records.map((r: any) => {
        const base = {
          id: r.transaction_hash,
          type: r.type,
          amount: "0",
          asset_type: "native",
          from: "",
          to: "",
          created_at: r.created_at,
        };

        if (r.type === "payment") {
          base.amount = r.amount;
          base.from = r.from;
          base.to = r.to;
          base.asset_type = r.asset_type;
        } else if (r.type === "create_account") {
          base.amount = r.starting_balance;
          base.from = r.funder;
          base.to = r.account;
        }

        return base;
      });

      setHistory(records);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch history");
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, isLoading, error, fetchHistory };
}
