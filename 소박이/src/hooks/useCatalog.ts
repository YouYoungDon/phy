import { useQuery } from "@tanstack/react-query";
import { fetchItemCatalog, fetchMyItems } from "../services/itemService";
import type { ItemSummary } from "../types/domain";

export function useCatalog() {
  const catalogQuery = useQuery<ItemSummary[]>(["items", "catalog"], fetchItemCatalog, {
    staleTime: 30_000,
    retry: 1,
  });

  const myItemsQuery = useQuery<ItemSummary[]>(["items", "my"], fetchMyItems, {
    staleTime: 30_000,
    retry: 1,
  });

  return {
    catalog: catalogQuery,
    myItems: myItemsQuery,
  };
}
