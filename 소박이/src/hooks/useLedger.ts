import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLedgerEntries, saveLedgerEntry } from "../services/ledgerService";
import type { LedgerEntry } from "../types/domain";

export function useLedger(initialYear?: number, initialMonth?: number) {
  const queryClient = useQueryClient();
  const [year, setYear] = useState(initialYear ?? new Date().getFullYear());
  const [month, setMonth] = useState(initialMonth ?? new Date().getMonth() + 1);

  useEffect(() => {
    if (year < 2000) {
      setYear(new Date().getFullYear());
    }
  }, [year]);

  const ledgerQuery = useQuery<LedgerEntry[]>(["ledger", year, month], () => fetchLedgerEntries(year, month), {
    staleTime: 30_000,
    retry: 1,
  });

  const saveMutation = useMutation(saveLedgerEntry, {
    onSuccess: () => {
      queryClient.invalidateQueries(["ledger", year, month]);
    },
  });

  const monthLabel = useMemo(() => `${year}년 ${month.toString().padStart(2, "0")}월`, [year, month]);

  return {
    ...ledgerQuery,
    year,
    month,
    monthLabel,
    setYear,
    setMonth,
    saveLedgerEntry: saveMutation.mutateAsync,
  };
}
