import { apiFetch, apiPost } from "../lib/apiClient";
import type { LedgerEntry } from "../types/domain";

export function fetchLedgerEntries(year: number, month: number): Promise<LedgerEntry[]> {
  return apiFetch<LedgerEntry[]>(`/api/v1/ledger/calendar?year=${year}&month=${month}`);
}

export function saveLedgerEntry(payload: { category: string; amount: number; description?: string }): Promise<LedgerEntry> {
  return apiPost<LedgerEntry, typeof payload>("/api/v1/ledger/spending", payload);
}
