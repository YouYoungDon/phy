import { apiFetch, apiPost } from "../lib/apiClient";
import type { QuestSummary } from "../types/domain";

export function fetchCurrentQuests(): Promise<QuestSummary[]> {
  return apiFetch<QuestSummary[]>("/api/v1/quests/current");
}

export function progressQuest(id: string): Promise<QuestSummary> {
  return apiPost<QuestSummary, { id: string }>(`/api/v1/quests/${encodeURIComponent(id)}/progress`, { id });
}
