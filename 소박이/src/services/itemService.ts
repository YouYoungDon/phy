import { apiFetch } from "../lib/apiClient";
import type { ItemSummary } from "../types/domain";

export function fetchItemCatalog(): Promise<ItemSummary[]> {
  return apiFetch<ItemSummary[]>("/api/v1/items/catalog");
}

export function fetchMyItems(): Promise<ItemSummary[]> {
  return apiFetch<ItemSummary[]>("/api/v1/items/my");
}
